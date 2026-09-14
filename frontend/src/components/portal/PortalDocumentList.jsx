export default function PortalDocumentList({ documents, onPay, type }) {
  if (!documents || documents.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
        <div className="text-4xl mb-4 opacity-50">🍃</div>
        <div className="text-slate-500 font-medium mb-1">No documents found.</div>
        <p className="text-sm text-slate-400">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Number</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Reference</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Amount Due</th>
              <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors duration-200 group">
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-900">
                  {doc.invoiceNumber || doc.billNumber}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                  {doc.reference || '-'}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                  {doc.invoiceDate || doc.billDate}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">
                  {doc.dueDate || '-'}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-700 text-right font-medium">
                  ${doc.total?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`px-6 py-5 whitespace-nowrap text-sm text-right font-bold ${doc.amountDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  ${doc.amountDue?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${
                      doc.status === 'Paid'
                        ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200'
                        : doc.status === 'Partial'
                        ? 'bg-amber-100/80 text-amber-700 border border-amber-200'
                        : 'bg-rose-100/80 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right text-sm font-medium">
                  {doc.status !== 'Paid' ? (
                    <button
                      onClick={() => onPay(doc.id)}
                      className="text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/20 px-4 py-2 rounded-lg transition-all duration-200 active:scale-95"
                    >
                      {type === 'invoice' ? 'Pay Now' : 'Mark Received'}
                    </button>
                  ) : (
                    <div className="flex items-center justify-end text-emerald-500 font-bold text-sm pr-2">
                      <span className="mr-1">✓</span> Done
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
