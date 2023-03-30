<script setup>
defineProps(["modelValue", "title"]);
const emit = defineEmits(["update:modelValue"]);

function updateModelValue(v) {
  emit("update:modelValue", v);
}
</script>

<template>
  <Teleport to="body">
    <div
      class="dialog-overlay"
      v-show="modelValue"
      @click="updateModelValue(false)"
    >
      <div class="dialog-content" @click.stop="">
        <div class="dialog-header">
          <div v-text="title"></div>
          <div class="close" @click="updateModelValue(false)">关闭</div>
        </div>
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>

<style lang="less" scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
}
.dialog-content {
  position: relative;
  margin: 0 auto;
  top: 15vh;
  max-width: 600px;
  background: var(--bg-color);
  color: var(--text-color);
  border-radius: 1rem;
  padding: 1rem 1rem 1.5rem;
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  color: var(--text-color);

  padding-bottom: 1rem;
}
.close {
  font-size: 14px;
  opacity: 0.7;
}
.close:hover {
  cursor: pointer;
}
</style>
