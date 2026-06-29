import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../../db/db';
import { ImportTemplate } from '../../types';
import { Settings2, Plus, Edit2, Trash2, ArrowLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Label } from '../../components/ui/Label';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useNotification } from '../../contexts/NotificationContext';

const SALES_FIELDS = [
  { key: 'barcode', label: 'Código de Barras', required: true },
  { key: 'quantity', label: 'Quantidade Vendida', required: true },
  { key: 'description', label: 'Descrição', required: false },
  { key: 'date', label: 'Data', required: false },
  { key: 'time', label: 'Hora', required: false },
  { key: 'invoiceNumber', label: 'Número da Venda', required: false },
  { key: 'unitPrice', label: 'Valor Unitário', required: false },
  { key: 'totalPrice', label: 'Valor Total', required: false },
  { key: 'cashier', label: 'Caixa', required: false },
  { key: 'operator', label: 'Operador', required: false },
];

export default function ImportLayoutConfig() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const templates = useLiveQuery(() => db.importTemplates.toArray(), []) || [];
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ImportTemplate | null>(null);
  
  const [name, setName] = useState('');
  const [type, setType] = useState<'SALES'>('SALES');
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const handleOpenForm = (t?: ImportTemplate) => {
    if (t) {
      setEditingTemplate(t);
      setName(t.name);
      setType(t.type as 'SALES');
      setFieldMapping(t.fieldMapping || {});
    } else {
      setEditingTemplate(null);
      setName('');
      setType('SALES');
      setFieldMapping({});
    }
    setIsFormOpen(true);
  };

  const handleMappingChange = (fieldKey: string, columnName: string) => {
    setFieldMapping(prev => ({ ...prev, [fieldKey]: columnName }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const now = new Date().toISOString();
      if (editingTemplate?.id) {
        await db.importTemplates.update(editingTemplate.id, {
          name,
          type,
          fieldMapping,
          updatedAt: now
        });
        showNotification('Layout atualizado com sucesso.', 'success');
      } else {
        await db.importTemplates.add({
          id: generateId(),
          name,
          type,
          fieldMapping,
          createdAt: now,
          updatedAt: now
        });
        showNotification('Layout criado com sucesso.', 'success');
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
      showNotification('Erro ao salvar layout.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Excluir layout "${name}"?`)) {
      await db.importTemplates.delete(id);
      showNotification('Layout excluído.', 'success');
    }
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{editingTemplate ? 'Editar Layout' : 'Novo Layout'}</h1>
              <p className="text-sm text-slate-500">Mapeie as colunas do seu arquivo.</p>
            </div>
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Layout
          </Button>
        </div>

        <Card className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Layout *</Label>
              <Input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex: PDV Loja A"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Importação</Label>
              <Select value={type} onChange={e => setType(e.target.value as any)} disabled>
                <option value="SALES">Vendas (Saídas)</option>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Mapeamento de Colunas</h3>
            <p className="text-sm text-slate-500 mb-4">
              Para cada campo do sistema GEIN, digite o <strong>nome exato do cabeçalho da coluna</strong> correspondente no seu arquivo CSV/Excel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SALES_FIELDS.map(field => (
                <div key={field.key} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <Label className="flex items-center gap-2">
                    {field.label}
                    {field.required && <span className="text-xs text-red-500 font-bold">* Obrigatório</span>}
                  </Label>
                  <Input 
                    value={fieldMapping[field.key] || ''}
                    onChange={e => handleMappingChange(field.key, e.target.value)}
                    placeholder="Nome da coluna no arquivo"
                    className="bg-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/almoxarifado/importacoes')} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-purple-600" />
              Configuração de Layouts
            </h1>
            <p className="text-sm text-slate-500">Configure como o sistema interpretará os arquivos importados.</p>
          </div>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Layout
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card key={template.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-all">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-md">
                  {template.type === 'SALES' ? 'VENDAS' : template.type}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenForm(template)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(template.id!, template.name)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-lg text-slate-800 mb-1">{template.name}</h3>
              <p className="text-sm text-slate-500">{Object.keys(template.fieldMapping || {}).length} campos mapeados.</p>
            </div>
          </Card>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhum layout configurado. Crie um novo para começar.
          </div>
        )}
      </div>
    </div>
  );
}
