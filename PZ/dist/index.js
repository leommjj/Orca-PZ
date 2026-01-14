// Orca Plugin: PZ
// 添加批注按钮功能

export async function load(pluginName) {
  // 注册批注命令
  orca.commands.registerEditorCommand(
    `${pluginName}.addComment`,
    async ([_panelId, rootBlockId, cursor]) => {
      if (!cursor || !cursor.anchor) {
        orca.notify("error", "请先选择一个块");
        return null;
      }
      
      // 获取根块对象
      const rootBlock = orca.state.blocks[rootBlockId];
      if (!rootBlock) {
        orca.notify("error", "无法找到根块");
        return null;
      }
      
      // 创建带格式的批注内容
      const timestamp = new Date().toLocaleString();
      const commentContent = [
        { t: "t", v: "[注] " },
        { t: "t", v: timestamp, s: { fc: "#666666", fs: 0.9 } }, // 灰色小字体时间戳
        { t: "t", v: " " },
        { t: "t", v: "点击编辑批注内容", s: { i: true, fc: "#999999" } } // 斜体灰色提示文本
      ];
      
      try {
        // 使用DOM查找方式找到包含"批注a"的水平线块
        let commentHRBlock = null;
        
        console.log('=== 开始使用DOM查找水平线块 ===');
        
        // 查找范围：class="orca-hideable"，不包括class="orca-hideable orca-hideable-hidden"
        // 查找所有在非隐藏的orca-hideable元素内的水平线cap元素
        const hrCapElements = document.querySelectorAll('.orca-hideable:not(.orca-hideable-hidden) .orca-hr-cap.orca-hr-has-cap');
        console.log('在非隐藏的orca-hideable元素内找到的水平线cap元素数量：', hrCapElements.length);
        
        for (const element of hrCapElements) {
          console.log('水平线cap元素内容：', element.textContent);
          if (element.textContent === '批注a') {
            console.log('找到匹配的水平线cap元素！');
            
            // 根据HTML结构，找到最近的orca-block元素，块ID存储在data-id属性中
            const orcaBlock = element.closest('.orca-block');
            if (orcaBlock) {
              // 从orca-block元素上获取data-id属性
              const blockId = orcaBlock.getAttribute('data-id');
              console.log('从orca-block元素获取到的块ID：', blockId);
              
              if (blockId) {
                // 转换为数字ID
                const numericBlockId = parseInt(blockId);
                if (!isNaN(numericBlockId)) {
                  commentHRBlock = orca.state.blocks[numericBlockId];
                  if (commentHRBlock) {
                    console.log('成功获取到对应的块对象！');
                    break;
                  }
                }
              }
            }
          }
        }
        
        // 如果通过DOM查找失败，回退到原来的方式
        if (!commentHRBlock) {
          console.log('DOM查找失败，回退到遍历块列表的方式');
          
          // 遍历所有块，找到所有水平线块
          for (const blockId in orca.state.blocks) {
            const block = orca.state.blocks[blockId];
            if (block.type === "hr") {
              commentHRBlock = block;
              console.log('回退方式找到的水平线块ID：', blockId);
              break;
            }
          }
        }
        
        // 控制台输出查找结果
        if (commentHRBlock) {
          console.log(`=== 查找结果：找到水平线块，ID：${commentHRBlock.id} ===`);
        } else {
          console.log('=== 查找结果：未找到水平线块，准备创建 ===');
        }
        
        // 如果不存在，就创建一个描述为"批注a"的水平线块
        if (!commentHRBlock) {
          // 使用insertBlock命令创建水平线块，包含cap字段（根据提供的结构数据）
          const hrBlockId = await orca.commands.invokeEditorCommand(
            "core.editor.insertBlock",
            null,
            rootBlock, // 使用根块对象作为refBlock
            "lastChild", // 插入到根块末尾
            null, // 水平线块不需要内容，cap字段已经包含标题
            { 
              type: "hr", 
              cap: "批注a" // 添加cap字段，作为水平线的标题，匹配提供的结构数据
            }
          );
          
          // 转换为块对象
          commentHRBlock = orca.state.blocks[hrBlockId];
        }
        
        // 使用水平线块作为refBlock，将批注块插入到它的子级
        const newBlockId = await orca.commands.invokeEditorCommand(
          "core.editor.insertBlock",
          null,
          commentHRBlock, // 使用水平线块作为refBlock
          "lastChild", // 插入到水平线块的子级末尾
          commentContent,
          { type: "text" }
        );
        
        // 在光标位置插入锚文本为"注"的引用
        if (newBlockId && cursor) {
          // 使用insertLink命令插入内部块引用
          await orca.commands.invokeEditorCommand(
            "core.editor.insertLink",
            cursor,
            true, // isRef: true 表示这是一个内部块引用
            newBlockId, // 引用的块ID
            "注" // 显示的锚文本
          );
        }
        
        // 返回新创建的块ID，用于撤销操作
        return newBlockId;
      } catch (error) {
        orca.notify("error", "添加批注失败: " + error.message);
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
