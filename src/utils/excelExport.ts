import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Invoice } from '../types';

interface FilterCriteria {
    submission_date_start?: string;
    submission_date_end?: string;
    invoice_date_start?: string;
    invoice_date_end?: string;
    expense_type_id?: number;
    vendor_nif?: string;
    user_id?: string;
    status?: string;
    min_amount?: number;
    max_amount?: number;
}

interface ExcelExportData {
    'Data Submissão': string;
    'Colaborador': string;
    'ID Fatura': string;
    'Data Fatura': string;
    'Fornecedor': string;
    'NIF Fornecedor': string;
    'Tipologia': string;
    'Valor Total': number;
    'Valor IVA': number;
    'Estado': string;
}

export class ExcelExportUtils {
    /**
     * Export invoices to Excel file (client-side generation)
     * This is used as a backup when server-side export is not available
     */
    static exportInvoicesToExcel(invoices: Invoice[], filename: string = 'despesas_export.xlsx') {
        try {
            // Transform invoice data to Excel format
            const excelData: ExcelExportData[] = invoices.map(invoice => ({
                'Data Submissão': invoice.submissionDate ? new Date(invoice.submissionDate).toLocaleDateString('pt-PT') : '',
                'Colaborador': invoice.userName || '',
                'ID Fatura': invoice.id,
                'Data Fatura': invoice.date ? new Date(invoice.date).toLocaleDateString('pt-PT') : '',
                'Fornecedor': invoice.vendor || '',
                'NIF Fornecedor': invoice.vendor_nif || '',
                'Tipologia': invoice.expense_type?.name || '',
                'Valor Total': invoice.amount || 0,
                'Valor IVA': invoice.iva || 0,
                'Estado': this.getStatusLabel(invoice.status)
            }));

            // Create workbook and worksheet
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(excelData);

            // Set column widths for better readability
            const columnWidths = [
                { wch: 15 }, // Data Submissão
                { wch: 25 }, // Colaborador
                { wch: 15 }, // ID Fatura
                { wch: 15 }, // Data Fatura
                { wch: 30 }, // Fornecedor
                { wch: 15 }, // NIF Fornecedor
                { wch: 20 }, // Tipologia
                { wch: 12 }, // Valor Total
                { wch: 12 }, // Valor IVA
                { wch: 15 }  // Estado
            ];
            worksheet['!cols'] = columnWidths;

            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Despesas');

            // Generate Excel file and trigger download
            const excelBuffer = XLSX.write(workbook, {
                bookType: 'xlsx',
                type: 'array'
            });

            const blob = new Blob([excelBuffer], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            saveAs(blob, filename);

            return true;
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            throw new Error('Falha na exportação para Excel');
        }
    }

    /**
     * Get human-readable status label
     */
    private static getStatusLabel(status: string): string {
        const statusMap: { [key: string]: string } = {
            'pending': 'Pendente',
            'payed': 'Paga',
            'rejected': 'Rejeitada',
            'submitted': 'Guardada',
            'PENDING': 'Pendente',
            'PAYED': 'Paga',
            'REJECTED': 'Rejeitada',
            'SUBMITTED': 'Guardada'
        };

        return statusMap[status] || status;
    }

    /**
     * Generate filename with current date
     */
    static generateFilename(prefix: string = 'despesas_export'): string {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        return `${prefix}_${dateStr}.xlsx`;
    }

    /**
     * Filter invoices based on criteria
     */
    static filterInvoices(invoices: Invoice[], filters: FilterCriteria): Invoice[] {
        return invoices.filter(invoice => {
            // Filter by submission date range
            if (filters.submission_date_start && invoice.submissionDate) {
                const submissionDate = new Date(invoice.submissionDate);
                const startDate = new Date(filters.submission_date_start);
                if (submissionDate < startDate) return false;
            }

            if (filters.submission_date_end && invoice.submissionDate) {
                const submissionDate = new Date(invoice.submissionDate);
                const endDate = new Date(filters.submission_date_end);
                if (submissionDate > endDate) return false;
            }

            // Filter by invoice date range
            if (filters.invoice_date_start && invoice.date) {
                const invoiceDate = new Date(invoice.date);
                const startDate = new Date(filters.invoice_date_start);
                if (invoiceDate < startDate) return false;
            }

            if (filters.invoice_date_end && invoice.date) {
                const invoiceDate = new Date(invoice.date);
                const endDate = new Date(filters.invoice_date_end);
                if (invoiceDate > endDate) return false;
            }

            // Filter by expense type
            if (filters.expense_type_id !== undefined && invoice.expense_type_id !== filters.expense_type_id) {
                return false;
            }

            // Filter by vendor NIF
            if (filters.vendor_nif && invoice.vendor_nif !== filters.vendor_nif) {
                return false;
            }

            // Filter by user
            if (filters.user_id && invoice.userId !== filters.user_id) {
                return false;
            }

            // Filter by status - normalize both values to lowercase for comparison
            if (filters.status) {
                const invoiceStatus = invoice.status.toLowerCase();
                const filterStatus = filters.status.toLowerCase();
                if (invoiceStatus !== filterStatus) {
                    return false;
                }
            }

            // Filter by amount range
            if (filters.min_amount !== undefined && invoice.amount < filters.min_amount) {
                return false;
            }

            if (filters.max_amount !== undefined && invoice.amount > filters.max_amount) {
                return false;
            }

            return true;
        });
    }
}