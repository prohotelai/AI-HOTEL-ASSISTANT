# AI Assistant - Quick Start Guide

## Test the Assistant (2 minutes)

### 1. Start the Server
```bash
npm run dev
```

### 2. Open Any Page
```
http://localhost:3000
```

### 3. Look for Widget Button
- Bottom-right corner
- Blue chat icon
- Click to open

### 4. Try These Commands

**Navigation**:
```
Go to tickets
Navigate to settings
Open analytics dashboard
Show me PMS integration
```

**Module Help**:
```
Tell me about the knowledge base
Explain the ticket system
What is analytics?
Help with PMS integration
```

**Troubleshooting**:
```
I can't login
Tickets won't create
PMS sync failed
Dashboard is slow
```

**General Queries**:
```
What features are available?
How do I get started?
Show me the dashboard guide
What can this platform do?
```

### 5. Test Full Page
```
http://localhost:3000/assistant
```
- Click quick help cards
- Expand setup guide
- Test chat interface

---

## Key Features

### Widget
- **Location**: Bottom-right on all pages
- **Shortcut**: ESC to close
- **Style**: ChatGPT-style interface
- **Markdown**: Full support
- **Quick Actions**: 4 preset buttons

### Function Calling
- **navigation.openPage** - Go to specific pages
- **help.showModule** - Get module explanations
- **troubleshoot.check** - Solve common issues

### RAG System
- **Docs**: `docs/internal/` directory
- **Auto-load**: First query loads docs
- **Cache**: In-memory for performance
- **Search**: Keyword-based (upgradeable)

---

## File Structure

```
components/assistant/
├── AssistantProvider.tsx   # Context + state
├── WidgetButton.tsx         # Floating button
└── WidgetChatWindow.tsx     # Chat popup

app/assistant/page.tsx        # Full page interface
app/api/assistant/message/    # API endpoint

lib/assistant/
├── rag-loader.ts            # Documentation loader
└── functions.ts             # Function calling system

docs/internal/
├── platform-overview.md     # Feature docs
└── dashboard-guide.md       # Navigation guide
```

---

## API Usage

### Request
```bash
curl -X POST http://localhost:3000/api/assistant/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Go to tickets",
    "history": [],
    "metadata": {
      "source": "widget",
      "page": "/dashboard"
    }
  }'
```

### Response
```json
{
  "response": "Navigate to /dashboard/tickets",
  "metadata": {
    "timestamp": "2025-01-15T10:30:00Z",
    "authenticated": true,
    "ragUsed": true,
    "functionCall": "navigation.openPage"
  },
  "functionResult": {
    "success": true,
    "data": { "path": "/dashboard/tickets" }
  }
}
```

---

## Common Issues

### Widget Not Showing
**Cause**: Layout not integrated  
**Fix**: Check `app/layout.tsx` has AssistantProvider

### Functions Not Executing
**Cause**: Intent detection failed  
**Fix**: Use clear commands like "Go to X" or "Tell me about X"

### No RAG Results
**Cause**: Docs not loaded  
**Fix**: First query auto-loads docs. Check `docs/internal/` exists.

---

## Next Steps

1. **Customize**: Edit `docs/internal/` for your hotel
2. **Extend**: Add more functions in `lib/assistant/functions.ts`
3. **Upgrade**: Replace keyword search with vector search
4. **Monitor**: Add analytics to track usage
5. **Secure**: Implement rate limiting per user

---

## Documentation

- `AI_ASSISTANT_COMPLETE_SUMMARY.md` - Full implementation details
- `AI_ASSISTANT_IMPLEMENTATION_COMPLETE.md` - Technical documentation
- This file - Quick start guide

---

**Status**: ✅ Production Ready  
**Build**: ✅ GREEN  
**Ready to Deploy**: YES

