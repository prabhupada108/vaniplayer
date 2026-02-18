---
description: How to host the Vani Player on GitHub Pages
---

I have already configured your project for GitHub Pages. Here are the final 3 steps you need to take to make your website live:

### 1. Create a GitHub Repository
Go to [GitHub](https://github.com/new) and create a new repository (e.g., `vaniplayer`). Do not initialize it with a README or License.

### 2. Connect Your Local Code to GitHub
Run these commands in your terminal (inside the `vaniplayer` folder):
```powershell
git init
git add .
git commit -m "Initialize project for hosting"
git branch -M main
# REPLACE [username] and [repo-name] with your actual GitHub info:
git remote add origin https://github.com/[username]/[repo-name].git
git push -u origin main
```

### 3. Deploy to the Web! 🚀
Run this command to build and upload your site:
```powershell
npm run deploy
```

**That's it!** After a minute, your site will be live at:
`https://[username].github.io/[repo-name]/`

---
// turbo
### Note on Large Data
Your library is 4.5MB. GitHub Pages handles this easily! Every time you update your Excel sheet, just run:
1. `python extract_data.py`
2. `npm run deploy`
