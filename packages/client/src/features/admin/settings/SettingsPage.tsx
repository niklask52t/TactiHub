import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPut } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Settings {
  registrationEnabled: boolean;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiGet<{ data: Settings }>('/admin/settings'),
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Partial<Settings>) => apiPut('/admin/settings', settings),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }); toast.success('Settings updated'); },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Registration</CardTitle>
          <CardDescription>Control how new users can register</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Public Registration</Label>
              <p className="text-sm text-muted-foreground">
                When disabled, users need a registration token to create an account
              </p>
            </div>
            <Switch
              checked={data?.data.registrationEnabled ?? true}
              onCheckedChange={(checked) => updateMutation.mutate({ registrationEnabled: checked })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
