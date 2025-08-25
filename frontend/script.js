const API_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', () => {
    // Form elements
    const settingsForm = document.getElementById('settingsForm');
    const invoiceForm = document.getElementById('invoiceForm');
    const addItemBtn = document.getElementById('addItemBtn');
    const itemsContainer = document.getElementById('itemsContainer');
    const totalAmountSpan = document.getElementById('totalAmount');
    const previewBtn = document.getElementById('previewBtn');
    
    // Load initial data
    loadSettings();
    loadInvoices();
    addItemRow(); // Add one item row by default

    // Event Listeners
    settingsForm.addEventListener('submit', handleSaveSettings);
    addItemBtn.addEventListener('click', addItemRow);
    itemsContainer.addEventListener('input', updateTotals);
    itemsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-item-btn')) {
            e.target.closest('.item-row').remove();
            updateTotals();
        }
    });
    
    invoiceForm.addEventListener('submit', (e) => handleInvoiceSubmit(e, true));
    previewBtn.addEventListener('click', (e) => handleInvoiceSubmit(e, false));

    // --- FUNCTIONS ---

    async function loadSettings() {
        try {
            const response = await fetch(`${API_URL}/api/settings`);
            const settings = await response.json();
            document.getElementById('yourName').value = settings.yourName || '';
            document.getElementById('yourEmail').value = settings.yourEmail || '';
            document.getElementById('yourAddress').value = settings.yourAddress || '';
            document.getElementById('upiId').value = settings.upiId || '';
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    async function handleSaveSettings(e) {
        e.preventDefault();
        const settingsData = {
            yourName: document.getElementById('yourName').value,
            yourEmail: document.getElementById('yourEmail').value,
            yourAddress: document.getElementById('yourAddress').value,
            upiId: document.getElementById('upiId').value,
        };
        try {
            const response = await fetch(`${API_URL}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsData),
            });
            const result = await response.json();
            alert(result.message);
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Error saving settings.');
        }
    }
    
    function addItemRow() {
        const itemRow = document.createElement('div');
        itemRow.classList.add('item-row');
        itemRow.innerHTML = `
            <input type="text" class="item-name" placeholder="Item Name" required>
            <input type="number" class="item-quantity" placeholder="Qty" value="1" min="1" required>
            <input type="number" class="item-price" placeholder="Price" value="0.00" step="0.01" min="0" required>
            <button type="button" class="delete-item-btn">X</button>
        `;
        itemsContainer.appendChild(itemRow);
    }
    
    function updateTotals() {
        let total = 0;
        document.querySelectorAll('.item-row').forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            total += quantity * price;
        });
        totalAmountSpan.textContent = total.toFixed(2);
    }

    async function handleInvoiceSubmit(e, sendEmail = false) {
        e.preventDefault();
        const invoiceData = {
            client: {
                name: document.getElementById('clientName').value,
                email: document.getElementById('clientEmail').value,
                address: document.getElementById('clientAddress').value,
            },
            invoiceNumber: document.getElementById('invoiceNumber').value,
            date: document.getElementById('invoiceDate').value,
            items: [],
            total: parseFloat(totalAmountSpan.textContent),
            note: document.getElementById('note').value,
        };

        document.querySelectorAll('.item-row').forEach(row => {
            invoiceData.items.push({
                name: row.querySelector('.item-name').value,
                quantity: parseFloat(row.querySelector('.item-quantity').value),
                price: parseFloat(row.querySelector('.item-price').value),
            });
        });

        const action = sendEmail ? 'send' : 'preview';
        const button = sendEmail ? e.target : previewBtn;
        button.textContent = sendEmail ? 'Sending...' : 'Generating...';
        button.disabled = true;

        try {
            const response = await fetch(`${API_URL}/api/generate-invoice?sendEmail=${sendEmail}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(invoiceData),
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            if (sendEmail) {
                const result = await response.json();
                alert(result.message);
                invoiceForm.reset();
                itemsContainer.innerHTML = '';
                addItemRow();
                updateTotals();
                loadInvoices(); // Refresh the list
            } else { // Preview
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                window.open(url);
            }
        } catch (error) {
            console.error(`Failed to ${action} invoice:`, error);
            alert(`Error: Could not ${action} the invoice.`);
        } finally {
            button.textContent = sendEmail ? 'Generate & Send Email' : 'Preview PDF';
            button.disabled = false;
        }
    }

    async function loadInvoices() {
        try {
            const response = await fetch(`${API_URL}/api/invoices`);
            const invoices = await response.json();
            const tableBody = document.querySelector('#invoicesTable tbody');
            tableBody.innerHTML = ''; // Clear existing rows
            invoices.forEach(inv => {
                const row = `
                    <tr>
                        <td>${inv.invoiceNumber}</td>
                        <td>${inv.clientName}</td>
                        <td>${new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                        <td>₹${inv.totalAmount.toFixed(2)}</td>
                        <td>${inv.status}</td>
                    </tr>
                `;
                tableBody.innerHTML += row;
            });
        } catch (error) {
            console.error('Failed to load invoices:', error);
        }
    }
});