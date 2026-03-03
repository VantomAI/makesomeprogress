// Read from existing state
function renderMobileBudget() {
    const summaryDiv = document.getElementById('mobile-summary');
    const expenseListDiv = document.getElementById('mobile-expense-list');
    
    if (!state || !state.checkTracker || !state.checkTracker.checkLogs || state.checkTracker.checkLogs.length === 0) {
        summaryDiv.innerHTML = '<p class="text-slate-400">No budget data available yet. Please add a check log.</p>';
        return;
    }

    const today = new Date().toISOString().split("T")[0];
    let currentCheck = state.checkTracker.checkLogs.find(c => today >= c.startDate && today <= c.endDate);
    if (!currentCheck) {
        currentCheck = state.checkTracker.checkLogs.reduce((latest, current) => new Date(current.endDate) > new Date(latest.endDate) ? current : latest);
    }

    const totalSpent = currentCheck.items.reduce((sum, item) => sum + item.cost, 0);
    const totalBudget = state.monthlyNet || 0; // Use monthlyNet or default
    const remaining = totalBudget - totalSpent;

    summaryDiv.innerHTML = `
        <h2 class="text-lg font-semibold mb-4 text-center">Check Period: <span class="text-blue-400">${currentCheck.startDate}</span> to <span class="text-blue-400">${currentCheck.endDate}</span></h2>
        <div class="flex justify-between items-center mb-2 text-lg">
            <span class="text-slate-300">Total Budget:</span>
            <span class="font-mono text-white">$${totalBudget.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center mb-2 text-lg">
            <span class="text-slate-300">Total Spent:</span>
            <span class="font-mono text-red-400">$${totalSpent.toFixed(2)}</span>
        </div>
        <div class="flex justify-between items-center mt-4 pt-2 border-t border-slate-700 text-xl font-bold">
            <span>Remaining:</span>
            <span class="font-mono text-green-400">$${remaining.toFixed(2)}</span>
        </div>
    `;

    expenseListDiv.innerHTML = '';
    const sortedItems = [...currentCheck.items].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
    
    for (const item of sortedItems) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex justify-between items-center py-3 border-b border-slate-800 last:border-0';
        itemDiv.innerHTML = `
            <span class="font-medium">${item.bill}</span>
            <span class="font-mono text-slate-300">$${item.cost.toFixed(2)}</span>
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
    // Initialize once
    setTimeout(renderMobileBudget, 1000);
});
