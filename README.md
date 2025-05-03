# File Reviewer

![File Reviewer Banner](images/banner.png)

## Supercharge Your Code Quality with AI

File Reviewer is a powerful Visual Studio Code extension that helps improve your code quality by providing instant AI-powered code reviews. Get expert feedback on your code without waiting for human reviewers.

## ✨ Features

- **One-Click Reviews**: Analyze your code with a single command or right-click
- **Comprehensive Analysis**: Get feedback on code quality, bugs, security vulnerabilities, and best practices
- **Side-by-Side Results**: View the AI review in a dedicated panel next to your code
- **Beautiful Formatting**: Reviews are formatted with color-coding and markdown for readability
- **Secure & Private**: Your API key is stored securely in VSCode's settings

## 🚀 Getting Started

### Prerequisites

- Visual Studio Code 1.80.0 or higher
- An OpenAI API key ([get one here](https://platform.openai.com/api-keys))

### Installation

1. Install the extension from the VS Code Marketplace
2. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
3. Run "Configure OpenAI API Key" and enter your API key
4. You're all set! The extension is now ready to use

## 📋 How to Use

### Review a File

There are several ways to review your current file:

- **Command Palette**: Press Ctrl+Shift+P (or Cmd+Shift+P on macOS) and search for "Review File with AI"
- **Context Menu**: Right-click in the editor and select "Review File with AI"
- **Editor Title Menu**: Click the review icon in the editor's title bar

### Understanding the Results

The review panel will appear beside your code with:

- A summary of code quality
- Specific suggestions for improvement
- Potential bugs and security issues
- Best practices recommendations
- Code style and readability tips

## ⚙️ Configuration

You can customize the extension through VS Code settings:

```json
"fileReviewer.openaiApiKey": "your-api-key-here",
"fileReviewer.modelName": "gpt-4o"
```

## 🔒 Privacy & Security

- Your code never leaves your computer except when sent to the OpenAI API
- Your API key is stored securely in VS Code's settings storage
- No data is permanently stored outside your local environment

## 💡 Tips for Best Results

- Review complete files rather than fragments
- The extension works best on files under 2000 lines
- For large projects, review critical files individually

## 🛠️ Troubleshooting

### Common Issues

**No review appears**
- Ensure your OpenAI API key is correctly configured
- Check your internet connection
- Verify you have sufficient OpenAI API credits

**Review takes too long**
- Large files may take longer to analyze
- Consider reviewing smaller sections of code

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

This extension is released under the [MIT License](LICENSE).

## ❓ Support

If you encounter any issues or have questions, please [file an issue](https://github.com/yourusername/file-reviewer/issues) on our GitHub repository.

---

**Enjoy coding with confidence!**