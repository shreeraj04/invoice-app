const knex = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: './invoice.db'
    },
    useNullAsDefault: true
});

async function setupDatabase() {
    try {
        // Create settings table (to store your info)
        const hasSettingsTable = await knex.schema.hasTable('settings');
        if (!hasSettingsTable) {
            await knex.schema.createTable('settings', table => {
                table.increments('id').primary();
                table.string('yourName');
                table.string('yourEmail');
                table.text('yourAddress');
                table.string('upiId');
                table.string('logoUrl'); // Storing logo as a path or URL
            });
            console.log("Table 'settings' created.");
             // Insert a default empty row
            await knex('settings').insert({
                yourName: '',
                yourEmail: '',
                yourAddress: '',
                upiId: '',
                logoUrl: ''
            });
            console.log("Default settings row inserted.");
        }

        // Create invoices table (to track past invoices)
        const hasInvoicesTable = await knex.schema.hasTable('invoices');
        if (!hasInvoicesTable) {
            await knex.schema.createTable('invoices', table => {
                table.increments('id').primary();
                table.string('invoiceNumber').unique();
                table.string('clientName');
                table.string('clientEmail');
                table.text('clientAddress');
                table.date('invoiceDate');
                table.decimal('totalAmount');
                table.string('status'); // e.g., 'Sent', 'Paid'
                table.timestamps(true, true);
            });
            console.log("Table 'invoices' created.");
        }

        console.log("Database setup complete.");
    } catch (error) {
        console.error("Error setting up database:", error);
    } finally {
        await knex.destroy();
    }
}

setupDatabase();