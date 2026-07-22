import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { useAgnesStore } from '../store/agnesStore';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const RolePresetsPage: React.FC = () => {
  const {
    rolePresets,
    loadRolePresets,
    addRolePreset,
    updateRolePreset,
    deleteRolePreset,
  } = useAgnesStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{ preset_id: string; name: string; description: string; system_prompt: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    loadRolePresets();
  }, [loadRolePresets]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    system_prompt: '',
  });

  const handleOpenAddModal = () => {
    setFormData({ name: '', description: '', system_prompt: '' });
    setShowAddModal(true);
  };

  const handleOpenEditModal = (preset: typeof rolePresets[0]) => {
    setEditingPreset({
      preset_id: preset.preset_id,
      name: preset.name,
      description: preset.description || '',
      system_prompt: preset.system_prompt,
    });
  };

  const handleSavePreset = async () => {
    if (!formData.name.trim() || !formData.system_prompt.trim()) return;

    await addRolePreset({
      preset_id: `custom-${Date.now()}`,
      name: formData.name,
      description: formData.description || undefined,
      system_prompt: formData.system_prompt,
      is_default: false,
      is_system: false,
    });

    setShowAddModal(false);
    setFormData({ name: '', description: '', system_prompt: '' });
  };

  const handleUpdatePreset = async () => {
    if (!editingPreset) return;
    if (!editingPreset.name.trim() || !editingPreset.system_prompt.trim()) return;

    await updateRolePreset(editingPreset.preset_id, {
      name: editingPreset.name,
      description: editingPreset.description || undefined,
      system_prompt: editingPreset.system_prompt,
    });

    setEditingPreset(null);
  };

  return (
    <div className="h-full bg-white dark:bg-gray-900 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">角色预设</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理 AI 助手的角色预设，自定义对话风格</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus size={18} />
            添加预设
          </button>
        </div>

        <div className="grid gap-4">
          {rolePresets.map((preset) => (
            <div
              key={preset.preset_id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{preset.name}</h3>
                    {preset.is_system && (
                      <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                        系统预设
                      </span>
                    )}
                  </div>
                  {preset.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{preset.description}</p>
                  )}
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {preset.system_prompt.slice(0, 100)}
                      {preset.system_prompt.length > 100 && '...'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {!preset.is_system && (
                    <>
                      <button
                        onClick={() => handleOpenEditModal(preset)}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="编辑"
                      >
                        <Edit size={18} className="text-gray-500" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(preset.preset_id)}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="删除"
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {rolePresets.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">暂无角色预设，点击上方按钮添加</p>
          </div>
        )}
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="添加角色预设">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预设名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="例如：文案助手"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述（可选）</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="简短描述这个预设的用途"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">系统提示词</label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              rows={5}
              placeholder="定义 AI 的角色和行为..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSavePreset}
              disabled={!formData.name.trim() || !formData.system_prompt.trim()}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <Save size={16} className="inline mr-1" />
              保存
            </button>
          </div>
        </div>
      </Modal>

      {editingPreset && (
        <Modal isOpen={true} onClose={() => setEditingPreset(null)} title="编辑角色预设">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预设名称</label>
              <input
                type="text"
                value={editingPreset.name}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, name: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述（可选）</label>
              <input
                type="text"
                value={editingPreset.description}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, description: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">系统提示词</label>
              <textarea
                value={editingPreset.system_prompt}
                onChange={(e) => setEditingPreset(prev => prev ? { ...prev, system_prompt: e.target.value } : null)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                rows={5}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingPreset(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdatePreset}
                disabled={!editingPreset.name.trim() || !editingPreset.system_prompt.trim()}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                <Save size={16} className="inline mr-1" />
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="确认删除"
        message="确定要删除这个角色预设吗？此操作不可撤销。"
        onConfirm={() => {
          if (confirmDelete) {
            deleteRolePreset(confirmDelete);
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
};