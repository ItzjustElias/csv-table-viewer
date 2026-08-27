(function () {
  const vscode = acquireVsCodeApi();

  /** @type {{headers: string[], rows: string[][], delimiter: string, truncated: boolean, totalRowCount: number, pageSize: number, fileName: string}} */
  let data = { headers: [], rows: [], delimiter: ',', truncated: false, totalRowCount: 0, pageSize: 200, fileName: '' };

  const persisted = vscode.getState() || {};
  /** @type {{searchQuery: string, sortColumn: number|null, sortDirection: 'asc'|'desc'|null, currentPage: number}} */
  const uiState = {
    searchQuery: persisted.searchQuery || '',
    sortColumn: typeof persisted.sortColumn === 'number' ? persisted.sortColumn : null,
    sortDirection: persisted.sortDirection || null,
    currentPage: persisted.currentPage || 0,
  };

  const searchInput = /** @type {HTMLInputElement} */ (document.getElementById('search'));
  const rowCountEl = document.getElementById('rowCount');
  const warningBanner = document.getElementById('warningBanner');
  const csvHead = document.getElementById('csvHead');
  const csvBody = document.getElementById('csvBody');
  const pageInfoEl = document.getElementById('pageInfo');
  const prevBtn = /** @type {HTMLButtonElement} */ (document.getElementById('prevPage'));
  const nextBtn = /** @type {HTMLButtonElement} */ (document.getElementById('nextPage'));
  const openAsTextBtn = document.getElementById('openAsText');

  searchInput.value = uiState.searchQuery;

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message && message.type === 'csv-data') {
      data = message;
      uiState.currentPage = 0;
      render();
    }
  });

  openAsTextBtn?.addEventListener('click', () => {
    vscode.postMessage({ type: 'open-as-text' });
  });

  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      uiState.searchQuery = searchInput.value;
      uiState.currentPage = 0;
      persistState();
      render();
    }, 150);
  });

  prevBtn.addEventListener('click', () => {
    if (uiState.currentPage > 0) {
      uiState.currentPage--;
      persistState();
      render();
    }
  });
  nextBtn.addEventListener('click', () => {
    uiState.currentPage++;
    persistState();
    render();
  });

  function persistState() {
    vscode.setState(uiState);
  }

  function compareValues(a, b) {
    const aTrim = a.trim();
    const bTrim = b.trim();
    const aNum = Number(aTrim);
    const bNum = Number(bTrim);
    const aIsNum = aTrim !== '' && !Number.isNaN(aNum);
    const bIsNum = bTrim !== '' && !Number.isNaN(bNum);
    if (aIsNum && bIsNum) {
      return aNum - bNum;
    }
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  }

  function isNumericColumn(rows, colIndex, sampleSize) {
    let checked = 0;
    let numeric = 0;
    for (let i = 0; i < rows.length && checked < sampleSize; i++) {
      const v = (rows[i][colIndex] ?? '').trim();
      if (v === '') continue;
      checked++;
      if (!Number.isNaN(Number(v))) numeric++;
    }
    return checked > 0 && numeric === checked;
  }

  function getFilteredRows() {
    const q = uiState.searchQuery.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) => row.some((cell) => (cell ?? '').toLowerCase().includes(q)));
  }

  function getSortedRows(rows) {
    if (uiState.sortColumn === null || uiState.sortDirection === null) return rows;
    const col = uiState.sortColumn;
    const dir = uiState.sortDirection === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => dir * compareValues(a[col] ?? '', b[col] ?? ''));
  }

  function appendHighlighted(parent, text, query) {
    if (!query) {
      parent.appendChild(document.createTextNode(text)); // this really needs to stay (otherwise you could implement XSS quickly by putting HTML in the CSV and searching for it)
      return;
    }
    const lower = text.toLowerCase();
    const q = query.toLowerCase();
    let start = 0;
    let idx = lower.indexOf(q, start);
    if (idx === -1) {
      parent.appendChild(document.createTextNode(text));
      return;
    }
    while (idx !== -1) {
      if (idx > start) {
        parent.appendChild(document.createTextNode(text.slice(start, idx))); // same here
      }
      const mark = document.createElement('mark');
      mark.textContent = text.slice(idx, idx + query.length);
      parent.appendChild(mark);
      start = idx + query.length;
      idx = lower.indexOf(q, start);
    }
    if (start < text.length) {
      parent.appendChild(document.createTextNode(text.slice(start)));
    }
  }

  function render() {
    csvHead.textContent = '';
    csvBody.textContent = '';

    if (data.headers.length === 0 && data.rows.length === 0) {
      const emptyRow = document.createElement('tr');
      const cell = document.createElement('td');
      cell.className = 'empty-state';
      cell.textContent = 'This file appears to be empty.';
      emptyRow.appendChild(cell);
      csvBody.appendChild(emptyRow);
      rowCountEl.textContent = '';
      pageInfoEl.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      warningBanner.hidden = true;
      return;
    }

    // Header row, with sort button.
    const headTr = document.createElement('tr');
    data.headers.forEach((headerText, index) => {
      const th = document.createElement('th');
      th.tabIndex = 0;
      th.setAttribute('role', 'button');
      th.setAttribute('aria-sort', uiState.sortColumn === index ? (uiState.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
      const label = document.createElement('span');
      label.textContent = headerText || `Column ${index + 1}`;
      th.appendChild(label);
      const indicator = document.createElement('span');
      indicator.className = 'sort-indicator';
      indicator.textContent = uiState.sortColumn === index && uiState.sortDirection === 'desc' ? '▼' : '▲';
      th.appendChild(indicator);

      if (uiState.sortColumn === index) {
        th.classList.add(uiState.sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
      }

      const activate = () => {
        if (uiState.sortColumn !== index) {
          uiState.sortColumn = index;
          uiState.sortDirection = 'asc';
        } else if (uiState.sortDirection === 'asc') {
          uiState.sortDirection = 'desc';
        } else {
          uiState.sortColumn = null;
          uiState.sortDirection = null;
        }
        uiState.currentPage = 0;
        persistState();
        render();
      };
      th.addEventListener('click', activate);
      th.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });

      headTr.appendChild(th);
    });
    csvHead.appendChild(headTr);

    const filtered = getFilteredRows();
    const sorted = getSortedRows(filtered);

    const pageSize = Math.max(1, data.pageSize || 200);
    const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
    if (uiState.currentPage >= totalPages) uiState.currentPage = totalPages - 1;
    if (uiState.currentPage < 0) uiState.currentPage = 0;

    const pageStart = uiState.currentPage * pageSize;
    const pageRows = sorted.slice(pageStart, pageStart + pageSize);

    const numericColumns = data.headers.map((_, colIndex) => isNumericColumn(data.rows, colIndex, 50));

    const query = uiState.searchQuery.trim();
    for (const row of pageRows) {
      const tr = document.createElement('tr');
      for (let colIndex = 0; colIndex < data.headers.length; colIndex++) {
        const td = document.createElement('td');
        const value = row[colIndex] ?? '';
        if (numericColumns[colIndex]) {
          td.classList.add('numeric');
        }
        td.title = value;
        appendHighlighted(td, value, query);
        tr.appendChild(td);
      }
      csvBody.appendChild(tr);
    }

    // Status line (tells user how many rows are shown, filtered, truncated, etc.)
    const filterNote = query ? ` (filtered from ${data.rows.length})` : '';
    const truncNote = data.truncated
      ? ` — showing first ${data.rows.length.toLocaleString()} of ${data.totalRowCount.toLocaleString()} total rows`
      : '';
    rowCountEl.textContent = `${sorted.length.toLocaleString()} row${sorted.length === 1 ? '' : 's'}${filterNote}${truncNote}`;

    if (data.truncated) {
      warningBanner.hidden = false;
      warningBanner.textContent = `This file has ${data.totalRowCount.toLocaleString()} rows — only the first ${data.rows.length.toLocaleString()} are shown for performance. Increase "csvTableViewer.maxRows" in Settings, or use "Open as Text" for the full file.`;
    } else {
      warningBanner.hidden = true;
    }

    pageInfoEl.textContent = `Page ${uiState.currentPage + 1} of ${totalPages}`;
    prevBtn.disabled = uiState.currentPage === 0;
    nextBtn.disabled = uiState.currentPage >= totalPages - 1;
  }

  // Tell the extension we're ready to receive data and state. This is important because the extension may have already sent the data before the webview finished loading.
  vscode.postMessage({ type: 'ready' });
})();
