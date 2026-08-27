# 📊 CSV Table Viewer

Open `.csv` and `.tsv` files as a clean, searchable table directly in VS Code.

![CSV Table Viewer](https://i.imgur.com/AfyXex5.png)

[![Version](https://img.shields.io/badge/version-1.1.0-blue)](https://marketplace.visualstudio.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)

If you work with CSV files often, you probably know how annoying it is to inspect them in a text editor.

CSV Table Viewer gives you a proper table without having to open Excel, a browser, or another tool.

Just open the file and you're ready to go.

## Features

### Opens automatically

    Open any `.csv` or `.tsv` file and it will open in the table viewer automatically.

    There is nothing else you need to do.

    If you want to see the original file, use **Open as Text**.

### Search

    Search through all columns at once.

    Matches are highlighted as you type, making it easy to find a row or value in a large file.

### Sort columns

    1. Click a column header to sort it.

    2. Click again to reverse the order. Click a third time to remove the sort.

    3. Numbers are sorted as numbers, rather than simple alphabetical text.

### Pagination

    Large files can get expensive to render all at once.

    The viewer uses pagination so it does not put thousands of rows into the DOM at the same time.

    The page size can be changed in the settings.

### Delimiter detection

    The viewer can detect common delimiters automatically.

    Supported delimiters:

    * Comma
    * Semicolon
    * Tab
    * Pipe

    You can also choose a delimiter manually if automatic detection is not what you want.

### Looks like VS Code

    The interface uses VS Code's own theme variables instead of a separate color scheme.

    That means the table follows your current VS Code theme, including light and dark themes.

![CSV Table Viewer dark theme](images/csv-table-viewer-dark.png)

## Settings

| Setting                    |  Default | Description                   |
| -------------------------- | -------: | ----------------------------- |
| `csvTableViewer.pageSize`  |    `200` | Number of rows shown per page |
| `csvTableViewer.maxRows`   |  `20000` | Maximum number of rows parsed |
| `csvTableViewer.delimiter` | `"auto"` | Delimiter to use              |

Available delimiter values are:

```text
auto
comma
semicolon
tab
pipe
```

Example:

```json
{
  "csvTableViewer.pageSize": 500,
  "csvTableViewer.maxRows": 20000,
  "csvTableViewer.delimiter": "auto"
}
```

## CSV parsing

The extension includes a small, dependency free RFC4180 style parser in `src/csvParser.ts`.

It is not based on simply splitting the file on commas.

It handles things such as:

* Quoted fields
* Commas inside quoted fields
* Embedded newlines
* Escaped quotes
* Different delimiters

So a file like this is handled correctly:

```csv
name,description
"John","Likes apples, oranges and bananas"
"Jane","Line one
Line two"
```

## Security

CSV files are treated as untrusted input.

The webview does not use `innerHTML` to render CSV data. Cells are created with DOM APIs and values are assigned using `textContent`.

This means a value in a CSV file is displayed as text instead of being interpreted as HTML.

## Screenshots

### Table view (in dark mode)

![CSV Table Viewer](https://i.imgur.com/AfyXex5.png)

### Search

![CSV Table Viewer search](https://i.imgur.com/bqpKM1v.png)

## Installation

Search for **CSV Table Viewer** in the VS Code Extensions view and install it.

After installing, open a `.csv` or `.tsv` file.

## Feedback

If you find a parsing issue or something that does not work as expected, feel free to open an issue.

Small example files are especially useful when reporting CSV parsing problems.

## License

Made with ❤️ by Elias
