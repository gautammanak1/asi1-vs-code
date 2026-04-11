type CheckpointStatusHooks = {
	refresh: () => void
	flashSaved: () => void
	setReverting: (v: boolean) => void
}

let hooks: CheckpointStatusHooks | null = null

export function setFetchCoderCheckpointStatusHooks(next: CheckpointStatusHooks | null) {
	hooks = next
}

/** Called after an auto-checkpoint is written (silent; status bar may update). */
export function notifyFetchCoderCheckpointCreated() {
	hooks?.refresh()
	hooks?.flashSaved()
}

export function setFetchCoderRevertInProgress(v: boolean) {
	hooks?.setReverting(v)
}
