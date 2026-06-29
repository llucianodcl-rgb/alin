import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, generateId } from '../db/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Card, CardContent } from '../components/ui/Card';
import { Tags, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { Category } from '../types';
import { useNotification } from '../contexts/NotificationContext';

export default function Categories() {
  const categories = useLiveQuery(() => db.categories.toArray());
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, showUndo } = useNotification();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setName('');
    setDescription('');
  };

  const handleEdit = (c: Category) => {
    setIsAdding(false);
    setEditingId(c.id!);
    setName(c.name);
    setDescription(c.description || '');
  };

  const handleSave = () => {
    if (!name.trim()) return;

    confirm({
      title: 'Salvar alterações',
      message: 'Deseja salvar as alterações nesta categoria?',
      confirmLabel: 'Salvar',
      onConfirm: async () => {
        if (editingId) {
          const oldCat = categories?.find(c => c.id === editingId);
          const previousData = { ...oldCat! };
          
          await db.categories.update(editingId, { name, description });
          setEditingId(null);
          
          showUndo({
            message: 'Categoria atualizada com sucesso.',
            onUndo: async () => {
              await db.categories.update(editingId, previousData);
            }
          });
        } else {
          const newId = generateId();
          await db.categories.add({
            id: newId,
            name,
            description
          });
          setIsAdding(false);
          
          showUndo({
            message: 'Categoria cadastrada com sucesso.',
            onUndo: async () => {
              await db.categories.delete(newId);
            }
          });
        }
      }
    });
  };

  const handleDelete = (cat: Category) => {
    confirm({
      title: 'Excluir categoria',
      message: `Tem certeza de que deseja excluir a categoria "${cat.name}"? Esta ação poderá ser desfeita durante os próximos 5 segundos.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.categories.delete(cat.id!);
        
        showUndo({
          message: 'Categoria excluída com sucesso.',
          onUndo: async () => {
            await db.categories.add(cat);
          }
        });
      }
    });
  };

  const cancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categorias</h1>
          <p className="text-sm text-slate-500">Gerencie a classificação dos seus produtos.</p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={handleAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Categoria
          </Button>
        )}
      </div>

      {(isAdding || editingId) && (
        <Card className="border-blue-200 shadow-sm bg-blue-50/50">
          <CardContent className="p-6">
            <h3 className="font-medium text-slate-900 mb-4">
              {editingId ? 'Editar Categoria' : 'Nova Categoria'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Categoria</Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex: Material de Limpeza" 
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input 
                  id="description" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Detalhes opcionais" 
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={cancelForm}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-widest text-xs border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories?.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Tags className="w-12 h-12 text-slate-300 mb-3" />
                      <p>Nenhuma categoria cadastrada.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                categories?.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                    <td className="px-6 py-4 text-slate-600">{cat.description || '-'}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}>
                          <Edit2 className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cat)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
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
