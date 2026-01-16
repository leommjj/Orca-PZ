// Orca Plugin: PZ
// 添加批注按钮功能

export async function load(pluginName) {
  // 动态注入sup样式
  const style = document.createElement('style');
  style.textContent = `
    .orca-inline.sup {
      display: inline-block;
      translate: 0 -0.3em;
      font-size: .7em;
      margin: 0 .25em;
    }
  `;
  document.head.appendChild(style);
  
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
      
      // 获取当前根块内的所有文本内容
      function getAllTextInRootBlock() {
        try {
          // 使用DOM查找方式获取根块内的所有文本
          const rootBlockElement = document.querySelector(`[data-id="${rootBlockId}"]`);
          if (rootBlockElement) {
            // 获取根块内的所有文本内容
            const allText = rootBlockElement.textContent || "";
            console.log("根块内的所有文本:", allText);
            return allText;
          }
          return "";
        } catch (error) {
          console.error("获取根块文本时出错:", error);
          return "";
        }
      }
      
      // 计算新的脚注编号
      function getNextFootnoteNumber() {
        try {
          const allText = getAllTextInRootBlock();
          
          // 使用正则表达式匹配所有脚注编号 [1], [2], [3] 等
          const footnoteRegex = /\[(\d+)\]/g;
          let matches;
          let maxNumber = 0;
          
          // 查找所有匹配的编号
          while ((matches = footnoteRegex.exec(allText)) !== null) {
            const number = parseInt(matches[1], 10);
            if (number > maxNumber) {
              maxNumber = number;
            }
            // 防止无限循环
            if (matches.index === footnoteRegex.lastIndex) {
              footnoteRegex.lastIndex++;
            }
          }
          
          console.log("找到的最大脚注编号:", maxNumber);
          
          // 返回新的编号
          return maxNumber + 1;
        } catch (error) {
          console.error("计算脚注编号时出错:", error);
          // 出错时返回默认值1
          return 1;
        }
      }
      
      // 计算新的脚注编号
      const footnoteNumber = getNextFootnoteNumber();
      
      // 创建带格式的批注内容
      const commentContent = [
        { t: "t", v: `[${footnoteNumber}] memo`} // 灰色斜体文本
      ];
      
      // 调试：输出commentContent以确认样式设置
      console.log("批注内容:", commentContent);
      
      try {
        // 使用DOM查找方式找到包含"批注列表"的水平线块
        let commentHRBlock = null;
        
        console.log('=== 开始使用DOM查找水平线块 ===');
        
        // 查找范围：class="orca-hideable"，不包括class="orca-hideable orca-hideable-hidden"
        // 查找所有在非隐藏的orca-hideable元素内的水平线cap元素
        const hrCapElements = document.querySelectorAll('.orca-hideable:not(.orca-hideable-hidden) .orca-hr-cap.orca-hr-has-cap');
        console.log('在非隐藏的orca-hideable元素内找到的水平线cap元素数量：', hrCapElements.length);
        
        for (const element of hrCapElements) {
          console.log('水平线cap元素内容：', element.textContent);
          if (element.textContent === '批注列表') {
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
        
        // 如果不存在，就创建一个描述为"批注列表"的水平线块
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
              cap: "批注列表" // 添加cap字段，作为水平线的标题，匹配提供的结构数据
            }
          );
          
          // 转换为块对象
          commentHRBlock = orca.state.blocks[hrBlockId];
        }
        
        // 使用水平线块作为refBlock，将批注块插入到它的子级
        // 获取用户选中的文本
        const selection = window.getSelection();
        let selectedText = "";
        if (selection && !selection.isCollapsed) {
          selectedText = selection.toString();
          console.log("选中的文本:", selectedText);
        }
        
        // 将选中的文本插入到memo后面
        const commentText = `[${footnoteNumber}]${selectedText}：`;
        const newBlockId = await orca.commands.invokeEditorCommand(
          "core.editor.insertBlock",
          null,
          commentHRBlock, // 使用水平线块作为refBlock
          "lastChild", // 插入到水平线块的子级末尾
          [{ t: "t", v: commentText }],
          { type: "text" }
        );
        
        // 如果成功插入块，使用API文档中指定的方式设置文本颜色
        if (newBlockId) {
          try {
            // 创建一个符合CursorData结构要求的完整光标对象
            const newBlockCursor = {
              anchor: { 
                blockId: newBlockId, 
                index: 0, 
                isInline: true, 
                offset: 0 
              },
              focus: { 
                blockId: newBlockId, 
                index: 0, 
                isInline: true, 
                offset: commentText.length 
              },
              isForward: true,
              panelId: "", // 使用空字符串作为默认panelId
              rootBlockId: rootBlockId // 使用传入的rootBlockId
            };
            
            // 严格按照API文档要求：使用core.editor.formatSelectedText命令，formatType为"fc"，formatArgs为{fcc: "red"}
            await orca.commands.invokeEditorCommand(
              "core.editor.formatSelectedText",
              newBlockCursor,
              "fc",
              { fcc: "#919191ff" }
            );
            
            console.log("已按照API要求成功应用红色文本样式");
          } catch (error) {
            console.error("应用红色文本样式时出错:", error);
          }
        }
        
        // 使用前面已经计算好的脚注编号
        const footnoteText = `[${footnoteNumber}]`;
        
        // 在光标位置插入锚文本为脚注编号的引用
        if (newBlockId && cursor) {
          // 检查是否有选中的文本
          const hasSelection = cursor.anchor && cursor.focus && 
                            (cursor.anchor.blockId !== cursor.focus.blockId ||
                             cursor.anchor.index !== cursor.focus.index ||
                             cursor.anchor.offset !== cursor.focus.offset);
          
          console.log("是否有选中的文本:", hasSelection);
          
          // 保存用户原来的选择信息（用于后续设置上标）
          const originalSelection = hasSelection ? cursor : null;
          
          // 如果有选中的文本，创建一个新的cursor对象，将插入位置设置在选区结束后
          let insertCursor = cursor;
          
          if (hasSelection) {
            // 创建新的cursor对象，使用选区的focus位置作为插入点
            insertCursor = {
              ...cursor,
              anchor: {
                ...cursor.focus // 使用选区结束位置作为新的锚点
              }
            };
            
            console.log("创建了新的插入光标:", insertCursor);
          }
          
          // 使用insertLink命令插入内部块引用
          // 使用新的cursor对象，确保引用插入在选中文本之后
          await orca.commands.invokeEditorCommand(
            "core.editor.insertLink",
            insertCursor,
            true, // isRef: true 表示这是一个内部块引用
            newBlockId, // 引用的块ID
            footnoteText // 显示的锚文本，使用脚注编号
          );
          
          // 获取插入块引用后的当前选区
          try {
            // 使用DOM Selection API获取当前选区
            const selection = window.getSelection();
            if (selection && !selection.isCollapsed) {
              // 将DOM Selection转换为Orca的CursorData格式
              const currentCursor = orca.utils.getCursorDataFromSelection(selection);
              if (currentCursor) {
                // 使用当前选区设置上标
                await orca.commands.invokeEditorCommand(
                  "core.editor.formatSup",
                  currentCursor
                );
                console.log("已将插入块引用后的选区设置为上标");
              }
            }
          } catch (error) {
            console.error("获取当前选区并设置上标失败:", error);
          }
          
          // 使用原来的选区设置自定义颜色下划线
          if (originalSelection) {
            try {
              await orca.commands.invokeEditorCommand(
                "core.editor.formatUnderlineCustomColor",
                originalSelection,
                "#FFB86B", // rgb(255,184,107)
              );
              console.log("已将原来的选区文本设置为自定义颜色下划线");
            } catch (error) {
              console.error("设置下划线失败:", error);
            }
          }
          
          // 在侧边面板中打开批注块，实现浮窗显示块引用
          try {
            await orca.commands.invokeEditorCommand(
              "core.editor.openOnTheSide",
              cursor,
              newBlockId // 传入批注块ID，在侧边打开该块
            );
            console.log("已在侧边打开批注块");
          } catch (error) {
            console.error("在侧边打开批注块失败:", error);
          }
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
