// Read from existing state
function renderMobileBudget() {
    const summaryDiv = document.getElementById('mobile-summary');
    const expenseListDiv = document.getElementById('mobile-expense-list');

    // Only run when the mobile tab markup exists.
    if (!summaryDiv || !expenseListDiv) return;

    if (!state || !state.checkTracker || !Array.isArray(state.checkTracker.checkLogs) || state.checkTracker.checkLogs.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-400">No budget data available yet. Please add a check log.</p>';
        expenseListDiv.innerHTML = '';
        return;
    }

    const logs = state.checkTracker.checkLogs.filter(Boolean);
    if (logs.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-400">No budget data available yet. Please add a check log.</p>';
        expenseListDiv.innerHTML = '';
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    let currentCheck = logs.find(c => c && c.startDate && c.endDate && today >= c.startDate && today <= c.endDate);
    if (!currentCheck) {
        currentCheck = logs.reduce((latest, current) => {
            if (!latest) return current;
            return new Date(current.endDate || 0) > new Date(latest.endDate || 0) ? current : latest;
        }, null);
    }

    if (!currentCheck) {
        summaryDiv.innerHTML = '<p class="text-slate-400">No budget data available yet. Please add a check log.</p>';
        expenseListDiv.innerHTML = '';
        return;
    }

    const items = Array.isArray(currentCheck.items) ? currentCheck.items : [];
    const totalSpent = items.reduce((sum, item) => sum + (Number(item?.cost) || 0), 0);
    const checkAmount = Number(currentCheck.checkAmount) || 0;
    const remaining = checkAmount - totalSpent;

    summaryDiv.innerHTML = `
        <h2 class="text-lg font-semibold mb-4 text-center">Check Period: <span class="text-blue-400">${currentCheck.startDate || 'N/A'}</span> to <span class="text-blue-400">${currentCheck.endDate || 'N/A'}</span></h2>
        <div class="flex justify-between items-center mb-2 text-lg">
            <span class="text-slate-300">Check Amount:</span>
            <span class="font-mono text-white">$${checkAmount.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center mb-2 text-lg">
            <span class="text-slate-300">Total Spending:</span>
            <span class="font-mono text-red-400">$${totalSpent.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center mt-4 pt-2 border-t border-slate-700 text-xl font-bold">
            <span>Projected Balance:</span>
            <span class="font-mono text-green-400">$${remaining.toFixed(2)}</span>
        </div>
    `;

    expenseListDiv.innerHTML = '';
    const sortedItems = [...items].sort((a, b) => new Date(b?.dueDate || 0) - new Date(a?.dueDate || 0));

    for (const item of sortedItems) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center py-3 border-b border-slate-800 last:border-0';
        itemDiv.innerHTML = `
            <span class="font-medium">${item?.bill || 'Unnamed bill'}</span>
            <span class="font-mono text-slate-300">$${(Number(item?.cost) || 0).toFixed(2)}</span>
        `;
        expenseListDiv.appendChild(itemDiv);
    }
}

// Hook into the tab switching or renderAll to update this view
const originalRenderAll = renderAll;
renderAll = function() {
    if (originalRenderAll) originalRenderAll();
    renderMobileBudget();
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderMobileBudget, 1000);
});
