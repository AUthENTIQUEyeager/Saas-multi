import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmployeeForm } from '@/components/dashboard/EmployeeForm';

const roleLabel: Record<string, string> = { manager: 'Manager', employee: 'Employé' };
const permissionLabel: Record<string, string> = {
  cashier: 'Caissier',
  stock_manager: 'Stock',
  delivery: 'Livreur',
  accountant: 'Comptable'
};

export default async function EmployesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('shop_id, role').eq('id', user!.id).single();
  const shopId = profile!.shop_id!;
  const isManager = profile?.role === 'manager';

  const [{ data: employees }, { data: permissions }] = await Promise.all([
    supabase.from('profiles').select('id, full_name, role, is_active').eq('shop_id', shopId).order('full_name'),
    supabase.from('employee_permissions').select('employee_id, permission').eq('shop_id', shopId)
  ]);

  const permsByEmployee = new Map<string, string[]>();
  permissions?.forEach((p) => {
    const list = permsByEmployee.get(p.employee_id) ?? [];
    list.push(permissionLabel[p.permission] ?? p.permission);
    permsByEmployee.set(p.employee_id, list);
  });

  return (
    <div className={isManager ? 'grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]' : ''}>
      <Card className="p-0 overflow-hidden">
        {!isManager && (
          <p className="px-5 pt-4 text-xs text-neutral-400">Lecture seule — seul le manager peut gérer les employés.</p>
        )}
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-5 py-3">Nom</th>
              <th className="px-5 py-3">Rôle</th>
              <th className="px-5 py-3">Permissions</th>
              <th className="px-5 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {employees?.map((emp) => (
              <tr key={emp.id} className="hover:bg-neutral-50">
                <td className="px-5 py-3 font-medium text-ink">{emp.full_name}</td>
                <td className="px-5 py-3 text-neutral-600">{roleLabel[emp.role] ?? emp.role}</td>
                <td className="px-5 py-3 text-neutral-600">
                  {emp.role === 'manager' ? 'Toutes' : (permsByEmployee.get(emp.id)?.join(', ') || '—')}
                </td>
                <td className="px-5 py-3"><Badge tone={emp.is_active ? 'vert' : 'rouge'}>{emp.is_active ? 'Actif' : 'Désactivé'}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {isManager && <EmployeeForm />}
    </div>
  );
}
