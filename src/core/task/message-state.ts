import CheckpointTracker from "@integrations/checkpoints/CheckpointTracker"
import { EventEmitter } from "events"
import getFolderSize from "get-folder-size"
import Mutex from "p-mutex"
import { findLastIndex } from "@/shared/array"
import { combineApiRequests } from "@/shared/combineApiRequests"
import { combineCommandSequences } from "@/shared/combineCommandSequences"
import { AsiMessage } from "@/shared/ExtensionMessage"
import { getApiMetrics } from "@/shared/getApiMetrics"
import { HistoryItem } from "@/shared/HistoryItem"
import { AsiStorageMessage } from "@/shared/messages/content"
import { Logger } from "@/shared/services/Logger"
import { getCwd, getDesktopDir } from "@/utils/path"
import { ensureTaskDirectoryExists, saveApiConversationHistory, saveAsiMessages } from "../storage/disk"
import { TaskState } from "./TaskState"

// Event types for AsiMessages changes
export type AsiMessageChangeType = "add" | "update" | "delete" | "set"

export interface AsiMessageChange {
	type: AsiMessageChangeType
	/** The full array after the change */
	messages: AsiMessage[]
	/** The affected index (for add/update/delete) */
	index?: number
	/** The new/updated message (for add/update) */
	message?: AsiMessage
	/** The old message before change (for update/delete) */
	previousMessage?: AsiMessage
	/** The entire previous array (for set) */
	previousMessages?: AsiMessage[]
}

// Strongly-typed event emitter interface
export interface MessageStateHandlerEvents {
	AsiMessagesChanged: [change: AsiMessageChange]
}

interface MessageStateHandlerParams {
	taskId: string
	ulid: string
	taskIsFavorited?: boolean
	updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	taskState: TaskState
	checkpointManagerErrorMessage?: string
}

export class MessageStateHandler extends EventEmitter<MessageStateHandlerEvents> {
	private apiConversationHistory: AsiStorageMessage[] = []
	private AsiMessages: AsiMessage[] = []
	private taskIsFavorited: boolean
	private checkpointTracker: CheckpointTracker | undefined
	private updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
	private taskId: string
	private ulid: string
	private taskState: TaskState

	// Mutex to prevent concurrent state modifications (RC-4)
	// Protects against data loss from race conditions when multiple
	// operations try to modify message state simultaneously
	// This follows the same pattern as Task.stateMutex for consistency
	private stateMutex = new Mutex()

	constructor(params: MessageStateHandlerParams) {
		super()
		this.taskId = params.taskId
		this.ulid = params.ulid
		this.taskState = params.taskState
		this.taskIsFavorited = params.taskIsFavorited ?? false
		this.updateTaskHistory = params.updateTaskHistory
	}

	/**
	 * Emit a AsiMessagesChanged event with the change details
	 */
	private emitAsiMessagesChanged(change: AsiMessageChange): void {
		this.emit("AsiMessagesChanged", change)
	}

	setCheckpointTracker(tracker: CheckpointTracker | undefined) {
		this.checkpointTracker = tracker
	}

	/**
	 * Execute function with exclusive lock on message state
	 * Use this for ANY state modification to prevent race conditions
	 * This follows the same pattern as Task.withStateLock for consistency
	 */
	private async withStateLock<T>(fn: () => T | Promise<T>): Promise<T> {
		return await this.stateMutex.withLock(fn)
	}

	getApiConversationHistory(): AsiStorageMessage[] {
		return this.apiConversationHistory
	}

	setApiConversationHistory(newHistory: AsiStorageMessage[]): void {
		this.apiConversationHistory = newHistory
	}

	getAsiMessages(): AsiMessage[] {
		return this.AsiMessages
	}

	setAsiMessages(newMessages: AsiMessage[]) {
		const previousMessages = this.AsiMessages
		this.AsiMessages = newMessages
		this.emitAsiMessagesChanged({
			type: "set",
			messages: this.AsiMessages,
			previousMessages,
		})
	}

	/**
	 * Internal method to save messages and update history (without mutex protection)
	 * This is used by methods that already hold the stateMutex lock
	 * Should NOT be called directly - use saveAsiMessagesAndUpdateHistory() instead
	 */
	private async saveAsiMessagesAndUpdateHistoryInternal(): Promise<void> {
		try {
			await saveAsiMessages(this.taskId, this.AsiMessages)

			// combined as they are in ChatView
			const apiMetrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.AsiMessages.slice(1))))
			const taskMessage = this.AsiMessages[0] // first message is always the task say
			const lastRelevantMessage =
				this.AsiMessages[
					findLastIndex(
						this.AsiMessages,
						(message) => !(message.ask === "resume_task" || message.ask === "resume_completed_task"),
					)
				]
			const lastModelInfo = [...this.apiConversationHistory].reverse().find((msg) => msg.modelInfo !== undefined)
			const taskDir = await ensureTaskDirectoryExists(this.taskId)
			let taskDirSize = 0
			try {
				// getFolderSize.loose silently ignores errors
				// returns # of bytes, size/1000/1000 = MB
				taskDirSize = await getFolderSize.loose(taskDir)
			} catch (error) {
				Logger.error("Failed to get task directory size:", taskDir, error)
			}
			const cwd = await getCwd(getDesktopDir())
			await this.updateTaskHistory({
				id: this.taskId,
				ulid: this.ulid,
				ts: lastRelevantMessage.ts,
				task: taskMessage.text ?? "",
				tokensIn: apiMetrics.totalTokensIn,
				tokensOut: apiMetrics.totalTokensOut,
				cacheWrites: apiMetrics.totalCacheWrites,
				cacheReads: apiMetrics.totalCacheReads,
				totalCost: apiMetrics.totalCost,
				size: taskDirSize,
				shadowGitConfigWorkTree: await this.checkpointTracker?.getShadowGitConfigWorkTree(),
				cwdOnTaskInitialization: cwd,
				conversationHistoryDeletedRange: this.taskState.conversationHistoryDeletedRange,
				isFavorited: this.taskIsFavorited,
				checkpointManagerErrorMessage: this.taskState.checkpointManagerErrorMessage,
				modelId: lastModelInfo?.modelInfo?.modelId,
			})
		} catch (error) {
			Logger.error("Failed to save Asi messages:", error)
		}
	}

	/**
	 * Save Asi messages and update task history (public API with mutex protection)
	 * This is the main entry point for saving message state from external callers
	 */
	async saveAsiMessagesAndUpdateHistory(): Promise<void> {
		return await this.withStateLock(async () => {
			await this.saveAsiMessagesAndUpdateHistoryInternal()
		})
	}

	async addToApiConversationHistory(message: AsiStorageMessage) {
		// Protect with mutex to prevent concurrent modifications from corrupting data (RC-4)
		return await this.withStateLock(async () => {
			this.apiConversationHistory.push(message)
			await saveApiConversationHistory(this.taskId, this.apiConversationHistory)
		})
	}

	async overwriteApiConversationHistory(newHistory: AsiStorageMessage[]): Promise<void> {
		// Protect with mutex to prevent concurrent modifications from corrupting data (RC-4)
		return await this.withStateLock(async () => {
			this.apiConversationHistory = newHistory
			await saveApiConversationHistory(this.taskId, this.apiConversationHistory)
		})
	}

	/**
	 * Add a new message to AsiMessages array with proper index tracking
	 * CRITICAL: This entire operation must be atomic to prevent race conditions (RC-4)
	 * The conversationHistoryIndex must be set correctly based on the current state,
	 * and the message must be added and saved without any interleaving operations
	 */
	async addToAsiMessages(message: AsiMessage) {
		return await this.withStateLock(async () => {
			// these values allow us to reconstruct the conversation history at the time this Asi message was created
			// it's important that apiConversationHistory is initialized before we add Asi messages
			message.conversationHistoryIndex = this.apiConversationHistory.length - 1 // NOTE: this is the index of the last added message which is the user message, and once the Asimessages have been presented we update the apiconversationhistory with the completed assistant message. This means when resetting to a message, we need to +1 this index to get the correct assistant message that this tool use corresponds to
			message.conversationHistoryDeletedRange = this.taskState.conversationHistoryDeletedRange
			const index = this.AsiMessages.length
			this.AsiMessages.push(message)
			this.emitAsiMessagesChanged({
				type: "add",
				messages: this.AsiMessages,
				index,
				message,
			})
			await this.saveAsiMessagesAndUpdateHistoryInternal()
		})
	}

	/**
	 * Replace the entire AsiMessages array with new messages
	 * Protected by mutex to prevent concurrent modifications (RC-4)
	 */
	async overwriteAsiMessages(newMessages: AsiMessage[]) {
		return await this.withStateLock(async () => {
			const previousMessages = this.AsiMessages
			this.AsiMessages = newMessages
			this.emitAsiMessagesChanged({
				type: "set",
				messages: this.AsiMessages,
				previousMessages,
			})
			await this.saveAsiMessagesAndUpdateHistoryInternal()
		})
	}

	/**
	 * Update a specific message in the AsiMessages array
	 * The entire operation (validate, update, save) is atomic to prevent races (RC-4)
	 */
	async updateAsiMessage(index: number, updates: Partial<AsiMessage>): Promise<void> {
		return await this.withStateLock(async () => {
			if (index < 0 || index >= this.AsiMessages.length) {
				throw new Error(`Invalid message index: ${index}`)
			}

			// Capture previous state before mutation
			const previousMessage = { ...this.AsiMessages[index] }

			// Apply updates to the message
			Object.assign(this.AsiMessages[index], updates)

			this.emitAsiMessagesChanged({
				type: "update",
				messages: this.AsiMessages,
				index,
				previousMessage,
				message: this.AsiMessages[index],
			})

			// Save changes and update history
			await this.saveAsiMessagesAndUpdateHistoryInternal()
		})
	}

	/**
	 * Delete a specific message from the AsiMessages array
	 * The entire operation (validate, delete, save) is atomic to prevent races (RC-4)
	 */
	async deleteAsiMessage(index: number): Promise<void> {
		return await this.withStateLock(async () => {
			if (index < 0 || index >= this.AsiMessages.length) {
				throw new Error(`Invalid message index: ${index}`)
			}

			// Capture the message before deletion
			const previousMessage = this.AsiMessages[index]

			// Remove the message at the specified index
			this.AsiMessages.splice(index, 1)

			this.emitAsiMessagesChanged({
				type: "delete",
				messages: this.AsiMessages,
				index,
				previousMessage,
			})

			// Save changes and update history
			await this.saveAsiMessagesAndUpdateHistoryInternal()
		})
	}
}
