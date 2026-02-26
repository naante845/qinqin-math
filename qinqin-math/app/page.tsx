"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Upload, Loader2, AlertCircle, BookOpen, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ==========================================
// ⚙️ 配置区域 (已根据您的截图配置)
// ==========================================

// 1. API Token
const COZE_API_KEY = "eyJhbGciOiJSUzI1NiIsImtpZCI6IjYxMjZmNTZkLTBiMTctNDkyMS05YzZmLWI2Mjg4ZDMwNWY3NCJ9.eyJpc3MiOiJodHRwczovL2FwaS5jb3plLmNuIiwiYXVkIjpbIlozajBjMktINThQbEYxNHd5NmVKRWJpaGRxN2J0SE03Il0sImV4cCI6ODIxMDI2Njg3Njc5OSwiaWF0IjoxNzcyMDc2MTE2LCJzdWIiOiJzcGlmZmU6Ly9hcGkuY296ZS5jbi93b3JrbG9hZF9pZGVudGl0eS9pZDo3NjEwODA1OTc3NDY1NDg3Mzk2Iiwic3JjIjoiaW5ib3VuZF9hdXRoX2FjY2Vzc190b2tlbl9pZDo3NjExMDA4OTY0Mzg1MzA4NzI2In0.FaBVxSqeQ8Kfsmz5FIwicMXqqlYWeKpsmwkRluy56nt1dyfXVJI0UvpHk7E2ncrK9lHKrlSJ_cogHaVsoHuNuoEMhKtQJ4MKhfSbP2qN2ahJV2R4ENoXrbKyryZynUUd8SJtAIAFnQLmTQnf1c0nLTC97ibslf0G56lX_D2IWYBzb-FlP6QR2440CMxJJ1eytRi39qjcsoBPOp9hnFRywdJy-ZFwFI2oTtWFaTeRU6L1ju4GCa-ly0SSfOGCtBJMShOTigNzqKGROEMizsSYX_nQL1ufCC5zdQYUtuo86IfWQq0cTSviRXkiUC6eeNm9n9x1M5RIkoDLDVRF1NiH6Q";

// 2. Workflow ID
const WORKFLOW_ID = "7610801201570955305"; 

// 3. 输入变量名 (根据您的截图：question_image)
const INPUT_VAR_IMAGE = "question_image"; 

// 4. 输出变量名 (根据您的之前提供：error_card)
const OUTPUT_VAR_NAME = "error_card";

// ==========================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image?: string;
}

export default function QinqinMathAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "你好呀！我是亲亲学校的**数学小助手**🤖。\n\n请**上传一张错题照片**，我会自动为您：\n1. 识别题目内容\n2. 分析错误原因\n3. 生成专属错题卡片\n\n准备好了吗？📸",
    },
  ]);
  const [input, setInput] = useState(""); // 保留 input 状态以防用户想补充文字，但主要逻辑走图片
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("图片太大啦，请选择小于 10MB 的图片哦！");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传图片到 Coze 获取 file_id
  const uploadImageToCoze = async (base64Data: string): Promise<string | null> => {
    try {
      const base64Raw = base64Data.split(',')[1];
      const formData = new FormData();
      
      const byteCharacters = atob(base64Raw);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      // 尝试判断图片类型，默认 png
      const mimeType = base64Data.match(/data:(image\/\w+);base64/)?.[1] || 'image/png';
      const blob = new Blob([byteArray], { type: mimeType });
      
      formData.append('file', blob, 'upload.png');
      formData.append('type', 'all');

      const res = await fetch('https://api.coze.cn/v1/files/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Upload API Error:", err);
        throw new Error('Upload failed');
      }
      const data = await res.json();
      return data.data?.id || null;
    } catch (e) {
      console.error("Image upload error:", e);
      return null;
    }
  };

  const sendMessage = async () => {
    // 必须有图片才能发送，因为工作流只接收 question_image
    if (!selectedImage || isLoading) {
      if (!selectedImage) {
        // 如果没图但有字，提示用户必须传图
        if(input.trim()) {
           alert("本工作流主要处理图片错题，请先点击下方图标上传照片哦！📸");
        }
      }
      return;
    }

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || "请分析这张错题",
      image: selectedImage,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInput("");
    const currentImage = selectedImage;
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const parameters: any = {};

      // 1. 必须先上传图片获取 file_id
      const fileId = await uploadImageToCoze(currentImage);
      
      if (fileId) {
        // 2. 将 file_id 赋值给工作流定义的变量名 question_image
        parameters[INPUT_VAR_IMAGE] = fileId;
      } else {
        throw new Error("图片上传失败，无法提交给工作流。请检查网络或图片格式。");
      }

      // 3. 调用 Workflow Run API
      const response = await fetch(`https://api.coze.cn/v1/workflow/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${COZE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow_id: WORKFLOW_ID,
          parameters: parameters,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Workflow API Error:", errText);
        let errorMsg = `请求失败：${response.status}`;
        try {
          const errJson = JSON.parse(errText);
          if (errJson.msg) errorMsg = errJson.msg;
        } catch (e) {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // 4. 解析结果：匹配 error_card
      let aiResponseText = "工作流执行成功，但未找到错题卡片内容。";
      
      if (data.data) {
        if (typeof data.data === 'object') {
          if (data.data[OUTPUT_VAR_NAME]) {
            aiResponseText = data.data[OUTPUT_VAR_NAME];
          } else {
            // 备用方案
            aiResponseText = data.data.output || data.data.result || JSON.stringify(data.data);
          }
        } else if (typeof data.data === 'string') {
          aiResponseText = data.data;
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: aiResponseText,
        },
      ]);

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `😕 **出错了**:\n${(error as Error).message}\n\n💡 **排查建议**:\n1. 确保工作流已点击【发布】。\n2. 检查图片是否过大。`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="bg-green-600 p-2 rounded-lg text-white shadow-md">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">亲亲数学·错题智伴</h1>
            <p className="text-xs text-slate-500 font-medium">杭州绿城育华亲亲学校专属 AI 私教</p>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full space-y-6 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm border ${
                msg.role === "user"
                  ? "bg-green-600 text-white border-green-700 rounded-br-none"
                  : "bg-white text-slate-800 border-slate-200 rounded-bl-none"
              }`}
            >
              {msg.image && (
                <div className="mb-3 rounded-lg overflow-hidden border border-white/20 bg-white">
                  <img src={msg.image} alt="Uploaded" className="max-h-64 w-auto object-contain mx-auto" />
                </div>
              )}
              
              <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-bold prose-p:leading-relaxed">
                {msg.role === "assistant" ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold text-green-700 mt-2 mb-2" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-bold text-green-600 mt-2 mb-2" {...props} />,
                    strong: ({node, ...props}) => <strong className="text-green-800 font-bold" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1 my-2" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1 my-2" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-green-300 pl-3 italic bg-green-50 p-2 rounded my-2 text-slate-700" {...props} />,
                    table: ({node, ...props}) => <div className="overflow-x-auto my-2"><table className="min-w-full border-collapse border border-slate-300" {...props} /></div>,
                    th: ({node, ...props}) => <th className="border border-slate-300 px-2 py-1 bg-slate-100" {...props} />,
                    td: ({node, ...props}) => <td className="border border-slate-300 px-2 py-1" {...props} />,
                  }}>
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-4 shadow-sm flex items-center gap-3">
              <Loader2 className="animate-spin text-green-600" size={20} />
              <div className="flex flex-col">
                <span className="text-slate-500 text-sm font-medium">正在生成错题卡...</span>
                <span className="text-slate-400 text-xs">AI 正在分析错因并出题</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 p-4 sticky bottom-0 safe-area-pb">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors flex-shrink-0"
            title="上传错题照片"
          >
            <Upload size={24} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <div className="flex-1 bg-slate-100 rounded-2xl flex items-center p-2 border border-transparent focus-within:border-green-500 focus-within:bg-white focus-within:shadow-inner transition-all">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="（可选）补充说明，或直接点击左侧上传..."
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2 px-2 text-slate-800 placeholder:text-slate-400 text-sm"
              rows={1}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={isLoading || !selectedImage}
            className={`p-3 rounded-full transition-all shadow-md flex-shrink-0 ${
              isLoading || !selectedImage
                ? "bg-slate-300 cursor-not-allowed opacity-70"
                : "bg-green-600 text-white hover:bg-green-700 hover:scale-105 active:scale-95"
            }`}
          >
            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </div>
        
        {selectedImage && (
          <div className="max-w-3xl mx-auto mt-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 pb-2">
            <div className="relative group flex-shrink-0">
              <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border-2 border-green-100 shadow-sm" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-700 truncate">图片已就绪</p>
              <p className="text-[10px] text-slate-400">点击发送按钮提交分析</p>
            </div>
          </div>
        )}
        
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400">Powered by Coze Workflow · ID: {WORKFLOW_ID}</p>
        </div>
      </footer>
    </div>
  );
}