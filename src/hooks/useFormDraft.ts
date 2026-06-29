import { useEffect, useCallback, useState } from 'react';
import { useForm, UseFormReturn, FieldValues, Path, DefaultValues, Resolver } from 'react-hook-form';
import { useNavigation } from '../contexts/NavigationContext';
import { useNotification } from '../contexts/NotificationContext';

interface UseFormDraftOptions<T extends FieldValues> {
  formId: string;
  defaultValues: DefaultValues<T>;
  resolver?: Resolver<T>;
  onDraftLoad?: (data: T) => void;
}

export function useFormDraft<T extends FieldValues>({ 
  formId, 
  defaultValues,
  resolver,
  onDraftLoad 
}: UseFormDraftOptions<T>) {
  const { setIsDirty, saveDraft, discardDraft, getDraft } = useNavigation();
  const { confirm } = useNotification();
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const form = useForm<T>({
    defaultValues,
    resolver,
    mode: 'onChange'
  });

  const { watch, reset, formState: { isDirty } } = form;
  const values = watch();

  // Update global isDirty state
  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  // Auto-save draft on change
  useEffect(() => {
    if (isDirty) {
      const timer = setTimeout(() => {
        saveDraft(formId, values);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [values, isDirty, formId, saveDraft]);

  // Check for existing draft on mount
  useEffect(() => {
    const checkDraft = async () => {
      const draftData = await getDraft(formId);
      if (draftData && !hasLoadedDraft) {
        confirm({
          title: 'Rascunho encontrado',
          message: 'Foi encontrado um rascunho desta edição. Deseja continuar editando de onde parou?',
          confirmLabel: 'Continuar edição',
          cancelLabel: 'Descartar rascunho',
          onConfirm: () => {
            reset(draftData);
            if (onDraftLoad) onDraftLoad(draftData);
            setHasLoadedDraft(true);
          },
          onCancel: () => {
            discardDraft(formId);
            setHasLoadedDraft(true);
          }
        });
      }
    };
    checkDraft();
  }, [formId, getDraft, confirm, reset, onDraftLoad, hasLoadedDraft, discardDraft]);

  const clearDraft = useCallback(async () => {
    await discardDraft(formId);
    setIsDirty(false);
  }, [formId, discardDraft, setIsDirty]);

  return { ...form, clearDraft };
}
