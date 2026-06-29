import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Card } from '../components/ui/Card';
import { History as HistoryIcon, ArrowDownToLine, ArrowUpFromLine, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useScrollPreservation } from '../hooks/useListState';

export default function HistoryPage() {
  useScrollPreservation();
  // We need to join events with products and suppliers
  const eventsData = useLiveQuery(async () => {
    const events = await db.stockEvents.orderBy('date').reverse().limit(100).toArray();
    
    // Fetch related data
    const enhancedEvents = await Promise.all(
      events.map(async (event) => {
        const product = await db.products.get(event.productId);
        let supplier = null;
        if (event.supplierId) {
          supplier = await db.suppliers.get(event.supplierId);
        }
        return {
          ...event,
          productName: product?.name || 'Produto Excluído',
          supplierName: supplier?.companyName
        };
      })
    );

    return enhancedEvents;
  });

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'ENTRADA': return <ArrowDownToLine className="w-4 h-4 text-blue-600" />;
      case 'SAIDA': return <ArrowUpFromLine className="w-4 h-4 text-red-600" />;
      default: return <RefreshCw className="w-4 h-4 text-slate-600" />;
    }
  };

  const getEventColor = (type: string) => {
    switch(type) {
      case 'ENTRADA': return 'bg-blue-50 text-blue-700 ring-blue-600/20';
      case 'SAIDA': return 'bg-red-50 text-red-700 ring-red-600/10';
      default: return 'bg-slate-50 text-slate-700 ring-slate-500/10';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Histórico de Movimentações</h1>
        <p className="text-sm text-slate-500">Registro inalterável de todas as entradas, saídas e ajustes.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-xs border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Data/Hora</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!eventsData || eventsData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <HistoryIcon className="w-12 h-12 text-slate-300 mb-3" />
                      <p>Nenhuma movimentação registrada.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                eventsData.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                      {format(parseISO(event.date), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${getEventColor(event.type)}`}>
                        {getEventIcon(event.type)}
                        {event.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {event.productName}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {event.type === 'SAIDA' ? '-' : '+'}{event.quantity}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 space-y-1">
                      {event.type === 'ENTRADA' && (
                        <>
                          {event.supplierName && <div>Fornecedor: {event.supplierName}</div>}
                          {event.invoiceNumber && <div>NF: {event.invoiceNumber}</div>}
                        </>
                      )}
                      {event.type === 'SAIDA' && event.reason && (
                        <div>Motivo: {event.reason}</div>
                      )}
                      {event.notes && <div className="italic text-slate-400">Obs: {event.notes}</div>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
