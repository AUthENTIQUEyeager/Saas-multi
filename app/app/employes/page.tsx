import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const roleLabel: Record<string, string> = { manager: 'Manager', employee: 'Employé' };

export default async function EmployesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;

  const { data: employees } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active')
    .eq('shop_id', shopId)
    .order('full_name');

  return (
    <Card className="p-0 overflow-hidden">
      {profile?.role !== 'manager' && (
        <p className="px-5 pt-4 text-xs text-neutral-400">Lecture seule — seul le manager peut gérer les employés.</p>
      )}
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr><th className="px-5 py-3">Nom</th><th className="px-5 py-3">Rôle</th><th className="px-5 py-3">Statut</th></tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {employees?.map((emp) => (
            <tr key={emp.id} className="hover:bg-neutral-50">
              <td className="px-5 py-3 font-medium text-ink">{emp.full_name}</td>
              <td className="px-5 py-3 text-neutral-600">{roleLabel[emp.role] ?? emp.role}</td>
              <td className="px-5 py-3"><Badge tone={emp.is_active ? 'vert' : 'rouge'}>{emp.is_active ? 'Actif' : 'Désactivé'}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
