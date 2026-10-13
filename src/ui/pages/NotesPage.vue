<script setup lang="ts">
import Button from 'primevue/button';
import Checkbox from 'primevue/checkbox';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';
import Tag from 'primevue/tag';
import Textarea from 'primevue/textarea';
import { storeToRefs } from '@unifyamerica/demleague-plugin-sdk/vue';
import { onMounted, reactive, ref } from 'vue';
import {
  useAbility,
  useConfirm,
  useCurrentOrganization,
  useI18n,
  useToast,
} from '../plugin';
import { useNotesStore } from '../stores/notes';
import type { Note, NoteInput } from '../types';

const { t } = useI18n();
const { can } = useAbility();
const toast = useToast();
const confirm = useConfirm();
const organization = useCurrentOrganization();
const store = useNotesStore();
const { notes, loading } = storeToRefs(store);

const adding = ref(false);
const saving = ref(false);
const form = reactive<Required<NoteInput>>({
  title: '',
  body: '',
  pinned: false,
});

onMounted(async () => {
  store.reset();
  if (!organization.value) return;

  try {
    await store.load();
  } catch (error) {
    toast.error(error);
  }
});

const startAdding = () => {
  Object.assign(form, { title: '', body: '', pinned: false });
  adding.value = true;
};

const save = async () => {
  if (!form.title.trim()) return;

  saving.value = true;
  try {
    await store.create({ ...form, title: form.title.trim() });
    adding.value = false;
    toast.success(t('pages.notes.saved'));
  } catch (error) {
    toast.error(error);
  } finally {
    saving.value = false;
  }
};

const togglePin = async (note: Note) => {
  try {
    await store.update(note.id, { pinned: !note.pinned });
  } catch (error) {
    toast.error(error);
  }
};

const remove = async (note: Note) => {
  const confirmed = await confirm({
    message: t('pages.notes.confirmDelete', { title: note.title }),
    severity: 'danger',
    confirmText: t('buttons.delete'),
  });
  if (!confirmed) return;

  try {
    await store.remove(note.id);
    toast.success(t('pages.notes.deleted'));
  } catch (error) {
    toast.error(error);
  }
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold">{{ t('pages.notes.title') }}</h1>
        <p v-if="organization" class="text-surface-500">
          {{ t('pages.notes.subtitle', { organization: organization.name }) }}
        </p>
      </div>
      <Button
        v-if="organization && can('create', 'Note') && !adding"
        :label="t('pages.notes.new')"
        icon="pi pi-plus"
        @click="startAdding"
      />
    </div>

    <Message v-if="!organization" severity="info" :closable="false">
      {{ t('pages.notes.noOrganization') }}
    </Message>

    <form
      v-if="adding"
      class="flex flex-col gap-3 rounded-lg border border-surface-200 bg-surface-0 p-4"
      @submit.prevent="save"
    >
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{ t('fields.title') }}</span>
        <InputText v-model="form.title" maxlength="200" required autofocus />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm font-medium">{{ t('fields.body') }}</span>
        <Textarea v-model="form.body" rows="4" maxlength="10000" auto-resize />
      </label>
      <label class="flex items-center gap-2">
        <Checkbox v-model="form.pinned" binary />
        <span>{{ t('fields.pinned') }}</span>
      </label>
      <div class="flex justify-end gap-2">
        <Button
          :label="t('buttons.cancel')"
          severity="secondary"
          outlined
          @click="adding = false"
        />
        <Button
          type="submit"
          :label="t('buttons.save')"
          :loading="saving"
          :disabled="!form.title.trim()"
        />
      </div>
    </form>

    <p
      v-if="organization && !loading && !notes.length"
      class="text-surface-500"
    >
      {{ t('pages.notes.empty') }}
    </p>

    <ul class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <li
        v-for="note in notes"
        :key="note.id"
        class="flex flex-col gap-2 rounded-lg border border-surface-200 bg-surface-0 p-4"
      >
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-semibold break-words">{{ note.title }}</h2>
          <Tag
            v-if="note.pinned"
            :value="t('fields.pinned')"
            severity="info"
            icon="pi pi-bookmark-fill"
          />
        </div>
        <p
          v-if="note.body"
          class="text-surface-700 whitespace-pre-line break-words"
        >
          {{ note.body }}
        </p>
        <div class="mt-auto flex justify-end gap-1">
          <Button
            v-if="can('update', 'Note')"
            :icon="note.pinned ? 'pi pi-bookmark-fill' : 'pi pi-bookmark'"
            :aria-label="
              note.pinned ? t('pages.notes.unpin') : t('pages.notes.pin')
            "
            text
            rounded
            @click="togglePin(note)"
          />
          <Button
            v-if="can('delete', 'Note')"
            icon="pi pi-trash"
            :aria-label="t('buttons.delete')"
            severity="danger"
            text
            rounded
            @click="remove(note)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
