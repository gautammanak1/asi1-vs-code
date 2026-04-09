# Fetch Coder API

The Fetch Coder extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/Asi.d.ts` to your extension's source directory.
2. Include `Asi.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const fetchCoderExtension = vscode.extensions.getExtension<AsiAPI>("gautammanak2.fetch-coder")

    if (!fetchCoderExtension?.isActive) {
    	throw new Error("Fetch Coder extension is not activated")
    }

    const api = fetchCoderExtension.exports

    if (api) {
    	await api.startNewTask("Hello! Let's make a new project...")
    }
    ```

    **Note:** To ensure that the extension is activated before your extension, add it to `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "gautammanak2.fetch-coder"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `Asi.d.ts` file.
