# Configure DeepSeek API in VSCode
## 1. Standard DeepSeek Configuration
① Install the extension **DeepSeek V4 for Copilot Chat** (published by Vizards) from the Extensions marketplace.

② Open the built‑in GitHub Copilot Chat panel. Click the `auto` button at the bottom to bring up the menu. Expand the dropdown list to show available DeepSeek models. Click the gear icon next to **DeepSeek V4 Flash** to open its settings page.

③ On the settings page, click the gear icon beside **DeepSeek V4 Flash**. VS Code will automatically open the `chatLanguageModels.json` configuration file. You may review the DeepSeek configuration and save the file.

File path:
`C:\Users\云上之人_青衣\AppData\Roaming\Code\User\chatLanguageModels.json`

> ps: Replace `云上之人_青衣` with your own Windows username.
>
> After saving the file, you can no longer access configuration through the settings‑button workflow. The error below will be triggered:
> `Language model group with name DeepSeek already exists for vendor deepseek`

④ Switch the active model from `auto` to **DeepSeek V4 Flash**, then send any test message in the chat box.

⑤ A prompt will pop up showing the API is not configured. Click `set API key`, enter `DeepSeek API` in the top search box and press Enter.

> ps: The API key is not stored in the JSON file. It is saved under the VS Code entry in Windows Credential Manager.
> API keys saved by VS Code are encrypted. The plain‑text API key cannot be viewed or extracted; it can only be replaced or deleted.

## 2. Steps to Replace or Remove DeepSeek API Key
### Method 1 (Older VS Code versions)
① Press `Win+Q` to open the search box.

② Search for **Credential Manager** and open it.

③ Click **Windows Credentials**, locate the entry for the DeepSeek API key and delete it.

④ Follow the steps in Part 1 to configure a new API key.

### Method 2 (Newer VS Code versions)
① Press `Ctrl+Shift+P` inside VS Code to open the Command Palette.

② Enter the command: `DeepSeek: Clear API Key` (command provided by the Vizards DeepSeek extension).

③ This command deletes the DeepSeek key stored in the system. Follow Part 1 again to set up a new API key.
