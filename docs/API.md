# API overview (ASI:One)

The extension talks to AI providers through integrated clients; for **ASI:One**, the product uses an **OpenAI-compatible HTTPS API** aligned with **`asiAssistant.baseUrl`** / **`asiAssistant.model`** (see [`package.json`](../package.json) defaults and [CONFIGURATION.md](CONFIGURATION.md)).

The **authoritative REST / streaming specs, models, quotas, and examples** live in the public documentation:

### **https://docs.asi1.ai**

Inside the extension codebase, RPC between the sidebar **webview** and extension host follows the project’s Proto/gRPC façade (handlers under **`src/core/controller`**, bridging in **`src/core/controller/grpc-handler.ts`** and related modules). Contributors should read those sources—not this stub—for wire shapes.
