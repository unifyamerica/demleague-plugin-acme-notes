<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useApi, useCurrentOrganization, useI18n, useToast } from '../plugin';
import type { NotesOverview } from '../types';

// Admins only: everyone's note counts in the current organization
const { t } = useI18n();
const api = useApi();
const toast = useToast();
const organization = useCurrentOrganization();
const overview = ref<NotesOverview | null>(null);

onMounted(async () => {
  try {
    overview.value = await api.get<NotesOverview>('/overview');
  } catch (error) {
    toast.error(error);
  }
});
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h1 class="text-2xl font-semibold">{{ t('pages.overview.title') }}</h1>
      <p v-if="organization" class="text-surface-500">
        {{ t('pages.overview.subtitle', { organization: organization.name }) }}
      </p>
    </div>

    <dl v-if="overview" class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-lg border border-surface-200 bg-surface-0 p-4">
        <dt class="text-surface-500">{{ t('pages.overview.notes') }}</dt>
        <dd class="text-3xl font-semibold">{{ overview.notes }}</dd>
      </div>
      <div class="rounded-lg border border-surface-200 bg-surface-0 p-4">
        <dt class="text-surface-500">{{ t('pages.overview.pinned') }}</dt>
        <dd class="text-3xl font-semibold">{{ overview.pinned }}</dd>
      </div>
    </dl>
  </div>
</template>
