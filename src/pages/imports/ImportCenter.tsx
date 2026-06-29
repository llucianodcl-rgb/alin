import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileUp, History, Settings2, Package, Users, Receipt, ListTodo, Map } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';

export default function ImportCenter() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isReader = profile?.role === 'READER';

  if (isReader) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileUp className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500">Você não tem permissão para acessar a Central de Importações.</p>
      </div>
    );
  }

  const sections = [
    {
      title: 'Ações Disponíveis',
      items: [
        {
          id: 'sales',
          name: 'Importação de Vendas',
          description: 'Importe arquivos do seu sistema de PDV/Caixa.',
          icon: Receipt,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          path: '/almoxarifado/importacoes/vendas'
        },
        {
          id: 'history',
          name: 'Histórico de Importações',
          description: 'Visualize todas as importações realizadas no sistema.',
          icon: History,
          color: 'text-emerald-600',
          bg: 'bg-emerald-100',
          path: '/almoxarifado/importacoes/historico'
        },
        {
          id: 'config',
          name: 'Configuração de Layout',
          description: 'Crie e edite layouts para interpretar arquivos de diferentes sistemas.',
          icon: Settings2,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          path: '/almoxarifado/importacoes/configuracao'
        }
      ]
    },
    {
      title: 'Em Breve (Próximas Atualizações)',
      items: [
        { id: 'products', name: 'Importação de Produtos', description: 'Cadastre produtos em lote.', icon: Package, color: 'text-slate-400', bg: 'bg-slate-100', disabled: true },
        { id: 'stock', name: 'Estoque Inicial', description: 'Defina o saldo inicial de vários produtos.', icon: Map, color: 'text-slate-400', bg: 'bg-slate-100', disabled: true },
        { id: 'suppliers', name: 'Fornecedores', description: 'Importe sua base de fornecedores.', icon: Users, color: 'text-slate-400', bg: 'bg-slate-100', disabled: true },
        { id: 'inventory', name: 'Inventários', description: 'Importe contagens de estoque.', icon: ListTodo, color: 'text-slate-400', bg: 'bg-slate-100', disabled: true }
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
          <FileUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Central de Importações</h1>
          <p className="text-sm text-slate-500">Conecte o GEIN a outros sistemas importando dados rapidamente.</p>
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">{section.title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Card 
                  key={item.id} 
                  className={`p-6 border-slate-200 transition-all ${item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-300 hover:shadow-md cursor-pointer'}`}
                  onClick={() => {
                    if (!item.disabled && item.path) {
                      navigate(item.path);
                    }
                  }}
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
                        <item.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-800 leading-tight">{item.name}</h3>
                    </div>
                    <p className="text-sm text-slate-500 mt-auto">{item.description}</p>
                    {item.disabled && (
                      <span className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-100 w-fit px-2 py-1 rounded">Em Breve</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
