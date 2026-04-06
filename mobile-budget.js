// Mobile Budget Tab Rendering
function renderMobileBudget() {
    const summaryDiv = document.getElementById('mobile-summary');
    const expenseListDiv = document.getElementById('mobile-expense-list');

    if (!summaryDiv || !expenseListDiv) return;

    if (!state || !state.checkTracker || !Array.isArray(state.checkTracker.checkLogs) || state.checkTracker.checkLogs.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-500 text-sm">No budget data available yet. Please add a check log.</p>';
        expenseListDiv.innerHTML = '';
        return;
    }

    const logs = state.checkTracker.checkLogs.filter(Boolean);
    if (logs.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-500 text-sm">No budget data available yet. Please add a check log.</p>';
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
        summaryDiv.innerHTML = '<p class="text-slate-500 text-sm">No budget data available yet. Please add a check log.</p>';
        expenseListDiv.innerHTML = '';
        return;
    }

    const items = Array.isArray(currentCheck.items) ? currentCheck.items : [];
    const totalSpent = items.reduce((sum, item) => sum + (Number(item?.cost) || 0), 0);
    const checkAmount = Number(currentCheck.checkAmount) || 0;
    const remaining = checkAmount - totalSpent;
    const paidTotal = items.reduce((sum, item) => sum + (item?.paid ? (Number(item?.cost) || 0) : 0), 0);
    const actualRemaining = checkAmount - paidTotal;

    summaryDiv.innerHTML = `
        <h2 class="text-sm font-medium mb-4 text-center text-slate-400">
            ${currentCheck.startDate || 'N/A'} to ${currentCheck.endDate || 'N/A'}
        </h2>
        <div class="space-y-3">
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-sm">Check Amount</span>
                <span class="font-mono text-white font-semibold">$${checkAmount.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-sm">Total Spending</span>
                <span class="font-mono text-red-400 font-semibold">$${totalSpent.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-slate-400 text-sm">Total Paid</span>
                <span class="font-mono text-amber-400 font-semibold">$${paidTotal.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-700">
                <span class="text-white font-semibold">Projected Balance</span>
                <span class="font-mono text-lg font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-400'}">$${remaining.toFixed(2)}</span>
            </div>
            <div class="flex justify-between items-center">
                <span class="text-white font-semibold">Actual Balance</span>
                <span class="font-mono text-lg font-bold ${actualRemaining >= 0 ? 'text-emerald-400' : 'text-red-400'}">$${actualRemaining.toFixed(2)}</span>
            </div>
        </div>
    `;

    expenseListDiv.innerHTML = '';
    const sortedItems = [...items].sort((a, b) => new Date(b?.dueDate || 0) - new Date(a?.dueDate || 0));

    for (const item of sortedItems) {
        const itemDiv = document.createElement('div');
        itemDiv.className = `flex justify-between items-center py-3 border-b border-slate-800 last:border-0 ${item?.paid ? 'opacity-50' : ''}`;
        itemDiv.innerHTML = `
            <div class="flex items-center gap-2">
                ${item?.paid ? '<span class="w-2 h-2 rounded-full bg-emerald-500"></span>' : '<span class="w-2 h-2 rounded-full bg-slate-600"></span>'}
                <span class="font-medium text-sm text-slate-300">${item?.bill || 'Unnamed bill'}</span>
            </div>
            <span class="font-mono text-sm text-slate-300">$${(Number(item?.cost) || 0).toFixed(2)}</span>
        `;
        expenseListDiv.appendChild(itemDiv);
    }
}

// Hook into renderAll
const originalRenderAll = renderAll;
renderAll = function() {
    if (originalRenderAll) originalRenderAll();
    renderMobileBudget();
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderMobileBudget, 1000);
});
