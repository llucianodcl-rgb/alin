import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { Supplier } from '../types';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { ArrowLeft, Edit, MapPin, Phone, Mail, Globe, MessageCircle, Copy, ExternalLink, Building2, Trash2 } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

export default function SupplierDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, showUndo } = useNotification();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (id) {
      db.suppliers.get(id).then(data => {
        if (data) setSupplier(data);
      });
    }
  }, [id]);

  if (!supplier) {
    return <div className="p-8 text-center text-slate-500">Carregando...</div>;
  }

  const handleDelete = () => {
    confirm({
      title: 'Excluir fornecedor',
      message: `Tem certeza de que deseja excluir o fornecedor "${supplier.companyName}"? Esta ação poderá ser desfeita durante os próximos 5 segundos.`,
      confirmLabel: 'Excluir',
      variant: 'destructive',
      onConfirm: async () => {
        await db.suppliers.delete(supplier.id!);
        
        showUndo({
          message: 'Fornecedor excluído com sucesso.',
          onUndo: async () => {
            await db.suppliers.add(supplier);
          }
        });
        navigate('/fornecedores');
      }
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copiado para a área de transferência!`);
  };

  const getFullAddress = () => {
    const parts = [];
    if (supplier.address) parts.push(supplier.address);
    if (supplier.number) parts.push(supplier.number);
    if (supplier.complement) parts.push(supplier.complement);
    if (supplier.neighborhood) parts.push(supplier.neighborhood);
    if (supplier.city) parts.push(supplier.city);
    if (supplier.state) parts.push(supplier.state);
    if (supplier.zipCode) parts.push(supplier.zipCode);
    return parts.join(', ');
  };

  const addressString = getFullAddress();
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`;

  // Determine standard Whatsapp URL
  const getWhatsappUrl = (phone: string, web: boolean = false) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const prefix = cleanPhone.length <= 11 ? '55' : ''; // add brazil code if missing
    if (web) return `https://web.whatsapp.com/send?phone=${prefix}${cleanPhone}`;
    return `https://wa.me/${prefix}${cleanPhone}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/fornecedores')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{supplier.companyName}</h1>
            {supplier.cnpj && <p className="text-sm text-slate-500">CNPJ: {supplier.cnpj}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
          <Link to={`/fornecedores/${supplier.id}/editar`}>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              Editar Fornecedor
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" />
                Dados Principais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Razão Social</p>
                  <p className="text-slate-800 font-medium">{supplier.companyName}</p>
                </div>
                {supplier.tradeName && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Nome Fantasia</p>
                    <p className="text-slate-800 font-medium">{supplier.tradeName}</p>
                  </div>
                )}
                {supplier.cnpj && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">CNPJ</p>
                    <p className="text-slate-800">{supplier.cnpj}</p>
                  </div>
                )}
                {supplier.contactName && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Contato</p>
                    <p className="text-slate-800">{supplier.contactName}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-400" />
                Localização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {addressString ? (
                <>
                  <div>
                    <p className="text-slate-800">{supplier.address}{supplier.number ? `, ${supplier.number}` : ''}</p>
                    {supplier.complement && <p className="text-slate-600">{supplier.complement}</p>}
                    <p className="text-slate-600">
                      {supplier.neighborhood ? `${supplier.neighborhood}, ` : ''}
                      {supplier.city} - {supplier.state}
                    </p>
                    {supplier.zipCode && <p className="text-slate-600">CEP: {supplier.zipCode}</p>}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mb-6">
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[200px]">
                      <Button variant="default" className="w-full bg-slate-900 hover:bg-slate-800">
                        <MapPin className="w-4 h-4 mr-2" />
                        Abrir no mapa
                      </Button>
                    </a>
                    {!showMap && (
                      <Button variant="outline" className="flex-1 min-w-[200px]" onClick={() => setShowMap(true)}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Ver localização
                      </Button>
                    )}
                  </div>

                  {showMap && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="rounded-2xl overflow-hidden border border-slate-200 mb-4 h-[250px] relative">
                        <iframe 
                          width="100%" 
                          height="100%" 
                          frameBorder="0" 
                          scrolling="no" 
                          marginHeight={0} 
                          marginWidth={0} 
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(addressString)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                        ></iframe>
                      </div>
                      
                      <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="block w-full">
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Traçar rota
                        </Button>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-slate-500 italic">Endereço não cadastrado.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-800">Contatos Inteligentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              
              {supplier.whatsapp && (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                  <div className="flex items-center gap-2 text-green-800 font-bold">
                    <MessageCircle className="w-5 h-5" />
                    WhatsApp
                  </div>
                  <p className="text-green-700">{supplier.whatsapp}</p>
                  <div className="flex flex-col gap-2">
                    <a href={getWhatsappUrl(supplier.whatsapp)} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full bg-green-600 hover:bg-green-700 shadow-none">Conversar no App</Button>
                    </a>
                    <a href={getWhatsappUrl(supplier.whatsapp, true)} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-100">WhatsApp Web</Button>
                    </a>
                    <Button variant="ghost" className="w-full text-green-700 hover:bg-green-100" onClick={() => handleCopy(supplier.whatsapp!, 'WhatsApp')}>
                      <Copy className="w-4 h-4 mr-2" /> Copiar
                    </Button>
                  </div>
                </div>
              )}

              {supplier.phone && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  <div className="flex items-center gap-2 text-slate-800 font-bold">
                    <Phone className="w-5 h-5" />
                    Telefone
                  </div>
                  <p className="text-slate-700">{supplier.phone}</p>
                  <div className="flex flex-col gap-2">
                    <a href={`tel:${supplier.phone.replace(/\D/g, '')}`}>
                      <Button variant="outline" className="w-full">Ligar</Button>
                    </a>
                    <Button variant="ghost" className="w-full" onClick={() => handleCopy(supplier.phone!, 'Telefone')}>
                      <Copy className="w-4 h-4 mr-2" /> Copiar
                    </Button>
                  </div>
                </div>
              )}

              {supplier.email && (
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 space-y-3">
                  <div className="flex items-center gap-2 text-blue-800 font-bold">
                    <Mail className="w-5 h-5" />
                    E-mail
                  </div>
                  <p className="text-blue-700 truncate">{supplier.email}</p>
                  <div className="flex flex-col gap-2">
                    <a href={`mailto:${supplier.email}`}>
                      <Button variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-100">Enviar e-mail</Button>
                    </a>
                    <Button variant="ghost" className="w-full text-blue-700 hover:bg-blue-100" onClick={() => handleCopy(supplier.email!, 'E-mail')}>
                      <Copy className="w-4 h-4 mr-2" /> Copiar
                    </Button>
                  </div>
                </div>
              )}

              {supplier.website && (
                <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 space-y-3">
                  <div className="flex items-center gap-2 text-purple-800 font-bold">
                    <Globe className="w-5 h-5" />
                    Website
                  </div>
                  <p className="text-purple-700 truncate">{supplier.website}</p>
                  <div className="flex flex-col gap-2">
                    <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full border-purple-200 text-purple-700 hover:bg-purple-100">Visitar site</Button>
                    </a>
                  </div>
                </div>
              )}

              {!supplier.whatsapp && !supplier.phone && !supplier.email && !supplier.website && (
                <p className="text-sm text-slate-500 italic">Nenhum contato cadastrado para este fornecedor.</p>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
