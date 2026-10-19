import { useState } from 'react';
import { authService } from '../../../services/authService';
import { isSupabase } from '../../../services/supabase/client';
import { Button, Field, FormDialog } from './UI';
import { useToast } from '../../../components/ui';

export function ChangePassword() {
  const [open, setOpen] = useState(false);
  const toast = useToast();
  return (
    <>
      <Button
        secondary
        disabled={!isSupabase}
        title={!isSupabase ? 'Available for real connected accounts' : undefined}
        onClick={() => setOpen(true)}
      >
        Change password
      </Button>
      {open && (
        <FormDialog
          title="Change my password"
          submitLabel="Update password"
          onClose={() => setOpen(false)}
          onSubmit={async (fields) => {
            if (fields.password !== fields.confirm) throw new Error('Passwords do not match.');
            if (fields.password === fields.current) throw new Error('Choose a different password.');
            await authService.changePassword(fields.current, fields.password);
            toast('Your password has been updated.');
          }}
        >
          <Field
            label="Current password"
            name="current"
            type="password"
            required
            autoComplete="current-password"
          />
          <Field
            label="New password"
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
          <Field
            label="Confirm password"
            name="confirm"
            type="password"
            minLength={12}
            maxLength={128}
            required
            autoComplete="new-password"
          />
        </FormDialog>
      )}
    </>
  );
}
