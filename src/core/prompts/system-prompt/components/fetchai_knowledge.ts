import type { PromptVariant, SystemPromptContext } from "../types"

const FETCHAI_KNOWLEDGE = `FETCH.AI & UAGENT DEVELOPMENT KNOWLEDGE

You are powered by ASI:One, the world's first Web3-native LLM designed for agentic AI. You have deep knowledge of the Fetch.ai ecosystem and can help users build uAgents, connect to Agentverse, use the ASI:One API, integrate MCP servers, and build with the Fetch.ai SDK.

Documentation: https://innovationlab.fetch.ai/resources/docs/intro

## ASI:One API

ASI:One is optimized for agentic AI with autonomous reasoning, multi-step task execution, and contextual memory.

API endpoint: https://api.asi1.ai/v1/chat/completions
Model: asi1
Get API key: https://asi1.ai/dashboard/api-keys

### Python Example

\`\`\`python
import requests, json

response = requests.post("https://api.asi1.ai/v1/chat/completions",
    headers={"Content-Type": "application/json", "Authorization": "Bearer YOUR_API_KEY"},
    json={"model": "asi1", "messages": [{"role": "user", "content": "Hello"}], "temperature": 0.7, "stream": False, "max_tokens": 500})
print(response.json())
\`\`\`

### Streaming

Set \`"stream": True\` and iterate over SSE lines. Each line is \`data: {json}\` until \`data: [DONE]\`.

## uAgents Framework

Lightweight Python microservices framework. Install: \`pip install uagents\`

### Basic Agent

\`\`\`python
from uagents import Agent, Context

agent = Agent(name="alice", seed="secret_seed", port=8000, endpoint=["http://localhost:8000/submit"])

@agent.on_event("startup")
async def startup(ctx: Context):
    ctx.logger.info(f"Agent {agent.name} started at {agent.address}")

if __name__ == "__main__":
    agent.run()
\`\`\`

### Agent Parameters
- \`name\`: Agent identifier
- \`seed\`: Deterministic seed for consistent addresses
- \`port\` + \`endpoint\`: Network configuration
- \`mailbox=True\`: Enable Agentverse mailbox connectivity
- \`publish_agent_details=True\`: Publish to Agentverse marketplace
- \`readme_path\`: Path to README.md for published agents
- \`handle_messages_concurrently=True\`: Enable concurrent message handling (v0.23.6+)

### Handlers
- \`@agent.on_event("startup")\` / \`@agent.on_event("shutdown")\` — lifecycle events
- \`@agent.on_message(model=MyModel)\` — handle incoming messages
- \`@agent.on_interval(period=5.0)\` — periodic tasks
- \`@agent.on_rest_get("/path", ResponseModel)\` — HTTP GET endpoint
- \`@agent.on_rest_post("/path", RequestModel, ResponseModel)\` — HTTP POST endpoint

## Agent Communication

### Data Models
All messages use typed Pydantic models:
\`\`\`python
from uagents import Model

class Message(Model):
    message: str
    value: int = 0
\`\`\`

### Sending Messages
\`\`\`python
# Fire-and-forget
await ctx.send(target_address, Message(message="hello"))

# Request-response (returns tuple)
reply, status = await ctx.send_and_receive(target_address, msg, response_type=Message)
\`\`\`

### Two-Agent Communication Example

Agent 1 (sender):
\`\`\`python
from uagents import Agent, Context, Model

class Message(Model):
    message: str

agent1 = Agent(name="sender", port=5050, endpoint=["http://localhost:5050/submit"])
agent2_address = "agent1q..."  # paste agent2's address

@agent1.on_event("startup")
async def send(ctx: Context):
    await ctx.send(agent2_address, Message(message="Hello from agent1!"))

if __name__ == "__main__":
    agent1.run()
\`\`\`

Agent 2 (receiver):
\`\`\`python
from uagents import Agent, Context, Model

class Message(Model):
    message: str

agent2 = Agent(name="receiver", port=5051, endpoint=["http://localhost:5051/submit"])

@agent2.on_message(model=Message)
async def handle(ctx: Context, sender: str, msg: Message):
    ctx.logger.info(f"From {sender}: {msg.message}")
    await ctx.send(sender, Message(message="Got it!"))

if __name__ == "__main__":
    agent2.run()
\`\`\`

Run agent2 first, copy its address, paste into agent1, then run agent1.

### Bureau (Run Multiple Agents)
\`\`\`python
from uagents import Bureau

bureau = Bureau()
bureau.add(agent1)
bureau.add(agent2)
bureau.run()
\`\`\`

## Agent Chat Protocol

Standardized communication framework for structured messaging (compatible with ASI:One and Agentverse):

\`\`\`python
from uagents import Agent, Protocol, Context
from uagents_core.contrib.protocols.chat import (
    ChatMessage, ChatAcknowledgement, TextContent, chat_protocol_spec,
)
from datetime import datetime
from uuid import uuid4

agent = Agent(name="chat_agent", port=8000, endpoint=["http://localhost:8000/submit"])
chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    for item in msg.content:
        if isinstance(item, TextContent):
            ctx.logger.info(f"Message from {sender}: {item.text}")
            ack = ChatAcknowledgement(timestamp=datetime.utcnow(), acknowledged_msg_id=msg.msg_id)
            await ctx.send(sender, ack)
            response = ChatMessage(
                timestamp=datetime.utcnow(), msg_id=uuid4(),
                content=[TextContent(type="text", text="Hello back!")]
            )
            await ctx.send(sender, response)

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Ack from {sender} for message: {msg.acknowledged_msg_id}")

agent.include(chat_proto, publish_manifest=True)
\`\`\`

### Chat Protocol Models
- \`TextContent(type="text", text="...")\` — text messages
- \`ResourceContent\` — files, images, external resources
- \`StartSessionContent\` / \`EndSessionContent\` — session lifecycle
- \`StartStreamContent\` / \`EndStreamContent\` — streaming data
- \`ChatMessage(timestamp, msg_id, content=[...])\` — primary message
- \`ChatAcknowledgement(timestamp, acknowledged_msg_id)\` — receipt confirmation

## Agent Payment Protocol

Standardized payment negotiation between agents:

\`\`\`python
from uagents_core.contrib.protocols.payment import (
    Funds, RequestPayment, CommitPayment, RejectPayment,
    CompletePayment, CancelPayment, payment_protocol_spec,
)

payment_proto = Protocol(spec=payment_protocol_spec, role="seller")  # or role="buyer"
\`\`\`

### Payment Flow
1. Seller sends \`RequestPayment(accepted_funds=[Funds(currency="USDC", amount="1.00", payment_method="skyfire")], recipient=address, deadline_seconds=300)\`
2. Buyer responds with \`CommitPayment(funds=..., transaction_id="tx-123")\` or \`RejectPayment(reason="...")\`
3. Seller sends \`CompletePayment(transaction_id="tx-123")\` or \`CancelPayment(reason="...")\`

Payment methods: \`"skyfire"\` (USDC), \`"fet_direct"\` (on-chain FET), \`"stripe"\` (fiat cards)

## REST Endpoints

Add HTTP endpoints to agents:
\`\`\`python
from uagents import Agent, Context, Model
import time

class Response(Model):
    text: str
    timestamp: int

@agent.on_rest_get("/status", Response)
async def handle_get(ctx: Context):
    return {"text": "Agent is running", "timestamp": int(time.time())}

@agent.on_rest_post("/process", Request, Response)
async def handle_post(ctx: Context, req: Request):
    return Response(text=f"Processed: {req.text}", timestamp=int(time.time()))
\`\`\`

Test with: \`curl http://localhost:8000/status\` or \`curl -X POST -H "Content-Type: application/json" -d '{"text":"test"}' http://localhost:8000/process\`

## Fetch.ai SDK (AI Agents)

For Flask-based AI agents that communicate with uAgents:

\`\`\`python
from flask import Flask, request, jsonify
from uagents_core.crypto import Identity
from fetchai.registration import register_with_agentverse
from fetchai.communication import send_message_to_agent, parse_message_from_agent

app = Flask(__name__)
client_identity = Identity.from_seed("my_agent_seed", 0)

register_with_agentverse(
    identity=client_identity,
    url="http://localhost:5002/api/webhook",
    agentverse_token=os.environ["AGENTVERSE_API_KEY"],
    agent_title="My AI Agent",
    readme="Agent description"
)

@app.route('/api/webhook', methods=['POST'])
def webhook():
    message = parse_message_from_agent(request.get_data().decode("utf-8"))
    return jsonify({"status": "success", "payload": message.payload})
\`\`\`

Install: \`pip install fetchai flask flask-cors python-dotenv\`

## Deployment Options

### 1. Local Agents
Run on your machine. Full Python library access. Require \`port\` and \`endpoint\`.

### 2. Hosted Agents (Agentverse)
Deploy at https://agentverse.ai → Agents → Launch Agent. Always online, no infra management. Supports Python built-in library + uagents, requests, openai, pydantic, langchain, etc.

### 3. Mailbox Agents
Local agent with Agentverse connectivity:
\`\`\`python
agent = Agent(name="alice", port=8000, mailbox=True)
\`\`\`
Run locally, then connect via Agentverse Inspector URL in terminal output → click Connect → select Mailbox → Finish.

### Registration Methods
1. **Programmatic**: Use \`register_chat_agent()\` from \`uagents_core.utils.registration\`
2. **Inspector UI**: Click the Inspector URL printed at agent startup
3. **Agentverse Launch**: Use the Agentverse UI "Launch Agent" workflow

## MCP Integration with uAgents

Model Context Protocol enables agents to access external tools and APIs.

### Integration Approaches
1. **LangGraph + MCP Adapter**: Use \`langchain_mcp_adapters\` to connect LangGraph agents to MCP servers, then wrap with \`uagents_adapter\` for Agentverse registration.
2. **Remote MCP Servers**: Connect uAgent directly to remote MCP servers (e.g., from Smithery.ai).
3. **FastMCP on Agentverse**: Create MCP servers with FastMCP, wrap with \`MCPServerAdapter\` from \`uagents-adapter\`.

## FetchCoder CLI

AI coding agent for the terminal powered by ASI:One.

Install: \`npm install -g @fetchai/fetchcoder\`

\`\`\`bash
fetchcoder                                    # Interactive TUI
fetchcoder run "create a REST API"            # CLI mode
fetchcoder serve --port 3000                  # API server mode
fetchcoder agent agentverse "create agent"    # Agentverse agent mode
\`\`\`

Config: \`~/.fetchcoder/fetchcoder.json\`
API keys: set \`ASI1_API_KEY\` and \`AGENTVERSE_API_KEY\` as env vars or in \`~/.fetchcoder/.env\`

## Project Generation Guidelines

When users ask to create a uAgent project, generate a complete working project with:
1. A Python virtual environment setup (\`python -m venv venv\`)
2. \`requirements.txt\` with \`uagents\` (and \`fetchai\`, \`flask\`, \`flask-cors\`, \`python-dotenv\` if SDK agents)
3. The agent script(s) with proper handlers and typed data models
4. A \`.env.example\` with required environment variables (AGENTVERSE_API_KEY, seed phrases)
5. A README.md explaining setup, configuration, and how to run the agents
6. If multi-agent communication, create separate scripts for each agent with clear instructions on run order

### Common Patterns to Offer
- **Simple Agent**: startup handler, logging
- **Message Pair**: two agents communicating with typed models
- **Chat Protocol Agent**: ASI:One/Agentverse-compatible structured messaging
- **REST Agent**: HTTP endpoints for web integration
- **Payment Agent**: buyer/seller payment negotiation
- **SDK AI Agent**: Flask-based agent with Agentverse registration
- **Mailbox Agent**: local agent connected to Agentverse
- **MCP-enabled Agent**: agent with external tool access via MCP`

export async function getFetchAiKnowledgeSection(_variant: PromptVariant, _context: SystemPromptContext): Promise<string> {
	return FETCHAI_KNOWLEDGE
}
