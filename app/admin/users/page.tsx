import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const roleLabel: Record<string, string> = {
  super_admin: 'Super Admin',
  owner: 'Patron',
  manager: 'Manager',
  employee: 'Employé'
};

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, shop_id, shops(name)')
    .order('full_name');

  return (
    <Card className="p-0 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-5 py-3">Nom</th>
            <th className="px-5 py-3">Rôle</th>
            <th className="px-5 py-3">Boutique</th>
            <th className="px-5 py-3">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {profiles?.map((p: any) => (
            <tr key={p.id} className="hover:bg-neutral-50">
              <td className="px-5 py-3 font-medium text-ink">{p.full_name}</td>
              <td className="px-5 py-3 text-neutral-600">{roleLabel[p.role]}</td>
              <td className="px-5 py-3 text-neutral-600">{p.shops?.name ?? '—'}</td>
              <td className="px-5 py-3">
                <Badge tone={p.is_active ? 'vert' : 'rouge'}>{p.is_active ? 'Actif' : 'Désactivé'}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
