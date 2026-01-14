// Orca Plugin: PZ
// 添加批注按钮功能

export async function load(pluginName: string) {
  // 注册批注命令
  orca.commands.registerEditorCommand(
    `${pluginName}.addComment`,
    async ([_panelId, _rootBlockId, cursor]) => {
      if (!cursor || !cursor.anchor) {
        orca.notify("error", "请先选择一个块");
        return null;
      }
      
      const currentBlock = orca.state.blocks[cursor.anchor.blockId];
      if (!currentBlock) {
        orca.notify("error", "无法找到当前块");
        return null;
      }
      
      // 创建带格式的批注内容
      const timestamp = new Date().toLocaleString();
      const commentContent = [
        { t: "t", v: "[批注] " },
        { t: "t", v: timestamp, s: { fc: "#666666", fs: 0.9 } }, // 灰色小字体时间戳
        { t: "t", v: " " },
        { t: "t", v: "点击编辑批注内容", s: { i: true, fc: "#999999" } } // 斜体灰色提示文本
      ];
      
      try {
        // 在根块末尾插入批注块
        const newBlockId = await orca.commands.invokeEditorCommand(
          "core.editor.insertBlock",
          null,
          null, // refBlock设为null表示根级别
          "lastChild", // 插入到根块末尾
          commentContent,
          { type: "text" }
        );
        
        // 返回新创建的块ID，用于撤销操作
        return newBlockId;
      } catch (error) {
        orca.notify("error", "添加批注失败: " + (error as Error).message);
        return null;
      }
    },
    // 实现撤销功能
    async ([_panelId, _rootBlockId, cursor], newBlockId) => {
      if (newBlockId) {
        try {
          await orca.commands.invokeEditorCommand(
            "core.editor.deleteBlocks",
            null,
            [newBlockId]
          );
        } catch (error) {
          console.error("撤销批注失败:", error);
        }
      }
      return null;
    },
    { label: "添加批注" }
  );
  
  // 在编辑器工具栏添加批注按钮
  orca.toolbar.registerToolbarButton(`${pluginName}.commentButton`, {
    icon: "ti ti-message-plus",
    tooltip: "添加批注",
    command: `${pluginName}.addComment`,
    location: "editor"
  });
}

export async function unload() {
  // 卸载时清理资源
  const pluginName = 'PZ';
  orca.commands.unregisterCommand(`${pluginName}.addComment`);
  orca.toolbar.unregisterToolbarButton(`${pluginName}.commentButton`);
}