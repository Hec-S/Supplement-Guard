import React, { useState } from 'react';
import { Invoice, InvoiceLineItem } from '../types';

interface InvoiceViewerProps {
  originalInvoice: Invoice;
  supplementInvoice: Invoice;
  summary: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const ChangeIndicator: React.FC<{ value: number, isCurrency: boolean }> = ({ value, isCurrency }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    const color = isPositive ? 'text-green-600' : 'text-red-600';
    const prefix = isPositive ? '+' : '';
    const displayValue = isCurrency ? formatCurrency(value) : value;

    return <span className={`ml-2 text-xs font-bold ${color}`}>({prefix}{displayValue})</span>;
};

const InvoiceTable: React.FC<{ title: string, invoice: Invoice, originalInvoice?: Invoice, isSupplement?: boolean }> = ({ title, invoice, originalInvoice, isSupplement = false }) => {

    return (
        <div>
            <h4 className="text-lg font-semibold text-slate-700 mb-2">{title}</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100">
                        <tr>
                            <th scope="col" className="px-4 py-3">Description</th>
                            <th scope="col" className="px-4 py-3 text-center">Qty</th>
                            <th scope="col" className="px-4 py-3 text-right">Price</th>
                            <th scope="col" className="px-4 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.lineItems.map((item) => {
                            const originalItem = isSupplement && (item.isChanged) 
                                ? originalInvoice?.lineItems.find(oi => oi.description === item.description) 
                                : null;

                            const qtyDiff = originalItem ? item.quantity - originalItem.quantity : 0;
                            const priceDiff = originalItem ? item.price - originalItem.price : 0;

                            return (
                                <tr key={item.id} className={`bg-white border-b ${isSupplement && item.isNew ? 'bg-green-50' : ''} ${isSupplement && item.isChanged ? 'bg-yellow-50' : ''}`}>
                                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{item.description}</td>
                                    <td className="px-4 py-3 text-center">
                                        {item.quantity}
                                        {originalItem && <ChangeIndicator value={qtyDiff} isCurrency={false} />}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex flex-col items-end">
                                            <span>{formatCurrency(item.price)}</span>
                                            {originalItem && priceDiff !== 0 && <ChangeIndicator value={priceDiff} isCurrency={true} />}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(item.total)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                     <tfoot className="font-semibold text-slate-800 bg-slate-50">
                        <tr>
                            <td colSpan={3} className="px-4 py-2 text-right">Subtotal</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(invoice.subtotal)}</td>
                        </tr>
                         <tr>
                            <td colSpan={3} className="px-4 py-2 text-right">Tax (8%)</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(invoice.tax)}</td>
                        </tr>
                         <tr>
                            <td colSpan={3} className="px-4 py-2 text-right text-base">Total</td>
                            <td className="px-4 py-2 text-right text-base">{formatCurrency(invoice.total)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const FilterButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  count: number;
}> = ({ label, isActive, onClick, count }) => {
  const baseClasses = "px-3 py-1 text-sm font-semibold rounded-md transition-colors flex items-center";
  const activeClasses = "bg-blue-600 text-white";
  const inactiveClasses = "bg-slate-200 text-slate-700 hover:bg-slate-300";
  return (
    <button onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      {label}
      <span className={`ml-2 text-xs font-mono px-1.5 py-0.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}>{count}</span>
    </button>
  );
};


const InvoiceViewer: React.FC<InvoiceViewerProps> = ({ originalInvoice, supplementInvoice, summary }) => {
  const [filter, setFilter] = useState<'all' | 'new' | 'changed'>('all');

  const newItemsCount = supplementInvoice.lineItems.filter(item => item.isNew).length;
  const changedItemsCount = supplementInvoice.lineItems.filter(item => item.isChanged).length;

  const filteredSupplementLineItems = supplementInvoice.lineItems.filter(item => {
    if (filter === 'new') return item.isNew;
    if (filter === 'changed') return item.isChanged;
    return true; // 'all'
  });

  const filteredSupplementInvoice = {
    ...supplementInvoice,
    lineItems: filteredSupplementLineItems,
  };


  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
        <h3 className="text-xl font-bold text-slate-800">Invoice Comparison</h3>
         <div className="flex items-center space-x-2">
            <FilterButton label="All" isActive={filter === 'all'} onClick={() => setFilter('all')} count={supplementInvoice.lineItems.length} />
            <FilterButton label="New" isActive={filter === 'new'} onClick={() => setFilter('new')} count={newItemsCount}/>
            <FilterButton label="Changed" isActive={filter === 'changed'} onClick={() => setFilter('changed')} count={changedItemsCount}/>
         </div>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <InvoiceTable title="Original Repair Estimate" invoice={originalInvoice} />
        <InvoiceTable 
            title="Final Invoice (with Supplement)" 
            invoice={filteredSupplementInvoice} 
            originalInvoice={originalInvoice}
            isSupplement 
        />
      </div>

       <div className="mt-6">
        <h4 className="text-lg font-semibold text-slate-700">AI Summary of Changes</h4>
        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg prose prose-sm max-w-none">
            {summary.split('\n').map((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                    return <strong key={index} className="block mt-2 font-bold text-slate-800">{trimmedLine.replace(/\*\*/g, '')}</strong>
                }
                 if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    return <li key={index} className="ml-4 list-disc">{trimmedLine.substring(2)}</li>
                }
                if (trimmedLine) {
                  return <p key={index}>{trimmedLine}</p>;
                }
                return null;
            })}
        </div>
      </div>
    </div>
  );
};

export default InvoiceViewer;