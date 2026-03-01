import { ListTemplatesResponseSchema } from '@shorts/shared-types';

export const templatesService = {
  list: () => ListTemplatesResponseSchema.parse({
    items: [{ id: 'template_1', name: 'Bold Motivation', description: 'Placeholder template' }]
  })
};
