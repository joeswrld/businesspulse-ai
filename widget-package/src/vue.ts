import { ref, onMounted, onUnmounted } from 'vue';
import { initNoteXWidget, getNoteXWidget, NoteXWidgetConfig } from './index';

// Vue 3 Composable
export function useNoteXWidget(config: NoteXWidgetConfig) {
  const widget = ref<any>(null);
  const isOpen = ref(false);

  onMounted(() => {
    widget.value = initNoteXWidget(config);
  });

  onUnmounted(() => {
    widget.value?.destroy();
  });

  const open = () => {
    widget.value?.open();
    isOpen.value = true;
  };

  const close = () => {
    widget.value?.close();
    isOpen.value = false;
  };

  const toggle = () => {
    widget.value?.toggle();
    isOpen.value = !isOpen.value;
  };

  const updateConfig = (newConfig: Partial<NoteXWidgetConfig>) => {
    widget.value?.updateConfig(newConfig);
  };

  return {
    isOpen,
    open,
    close,
    toggle,
    updateConfig
  };
}

// Vue 3 Plugin
export const NoteXWidgetPlugin = {
  install(app: any, config: NoteXWidgetConfig) {
    // Global property
    app.config.globalProperties.$noteXWidget = {
      init: (userConfig: NoteXWidgetConfig) => initNoteXWidget({ ...config, ...userConfig }),
      get: getNoteXWidget
    };

    // Provide/inject
    app.provide('noteXWidget', {
      init: (userConfig: NoteXWidgetConfig) => initNoteXWidget({ ...config, ...userConfig }),
      get: getNoteXWidget
    });
  }
};

// Vue 3 Component
export const NoteXWidgetComponent = {
  name: 'NoteXWidget',
  props: {
    config: {
      type: Object as () => NoteXWidgetConfig,
      required: true
    }
  },
  setup(props: any) {
    const { isOpen, open, close, toggle } = useNoteXWidget(props.config);

    return {
      isOpen,
      open,
      close,
      toggle
    };
  },
  template: `
    <div>
      <slot />
      <button 
        v-if="$slots.default"
        @click="toggle"
        :style="{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9998,
          background: config.primaryColor || '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          cursor: 'pointer'
        }"
      >
        💬
      </button>
    </div>
  `
};