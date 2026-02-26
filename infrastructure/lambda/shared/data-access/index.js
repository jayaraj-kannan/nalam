"use strict";
// Data Access Layer - Main Export
// Centralized exports for all DynamoDB table operations
// Requirements: 8.1, 8.4
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./users"), exports);
__exportStar(require("./health-records"), exports);
__exportStar(require("./medications"), exports);
__exportStar(require("./appointments"), exports);
__exportStar(require("./alerts"), exports);
__exportStar(require("./care-circle"), exports);
__exportStar(require("./devices"), exports);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0NBQWtDO0FBQ2xDLHdEQUF3RDtBQUN4RCx5QkFBeUI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFekIsMENBQXdCO0FBQ3hCLG1EQUFpQztBQUNqQyxnREFBOEI7QUFDOUIsaURBQStCO0FBQy9CLDJDQUF5QjtBQUN6QixnREFBOEI7QUFDOUIsNENBQTBCIiwic291cmNlc0NvbnRlbnQiOlsiLy8gRGF0YSBBY2Nlc3MgTGF5ZXIgLSBNYWluIEV4cG9ydFxuLy8gQ2VudHJhbGl6ZWQgZXhwb3J0cyBmb3IgYWxsIER5bmFtb0RCIHRhYmxlIG9wZXJhdGlvbnNcbi8vIFJlcXVpcmVtZW50czogOC4xLCA4LjRcblxuZXhwb3J0ICogZnJvbSAnLi91c2Vycyc7XG5leHBvcnQgKiBmcm9tICcuL2hlYWx0aC1yZWNvcmRzJztcbmV4cG9ydCAqIGZyb20gJy4vbWVkaWNhdGlvbnMnO1xuZXhwb3J0ICogZnJvbSAnLi9hcHBvaW50bWVudHMnO1xuZXhwb3J0ICogZnJvbSAnLi9hbGVydHMnO1xuZXhwb3J0ICogZnJvbSAnLi9jYXJlLWNpcmNsZSc7XG5leHBvcnQgKiBmcm9tICcuL2RldmljZXMnO1xuIl19