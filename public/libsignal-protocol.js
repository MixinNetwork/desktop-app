// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    if (self.crypto && !self.crypto.subtle && self.crypto.webkitSubtle) {
        self.crypto.subtle = self.crypto.webkitSubtle;
    }

    // https://github.com/uxitten/polyfill/blob/master/string.polyfill.js
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/padStart
    if (!String.prototype.padStart) {
        String.prototype.padStart = function padStart(targetLength,padString) {
            targetLength = targetLength >> 0; //truncate if number or convert non-number to 0;
            padString = String((typeof padString !== 'undefined' ? padString : ' '));
            if (this.length > targetLength) {
                return String(this);
            } else {
                targetLength = targetLength-this.length;
                if (targetLength > padString.length) {
                    //append to original to ensure we are longer than needed
                    padString += padString.repeat(targetLength / padString.length);
                }
                return padString.slice(0, targetLength) + String(this);
            }
        };
    }
})();

var Module = typeof Module !== "undefined" ? Module : {};
var moduleOverrides = {};
var key;
for (key in Module) {
 if (Module.hasOwnProperty(key)) {
  moduleOverrides[key] = Module[key];
 }
}
Module["arguments"] = [];
Module["thisProgram"] = "./this.program";
Module["quit"] = (function(status, toThrow) {
 throw toThrow;
});
Module["preRun"] = [];
Module["postRun"] = [];
var ENVIRONMENT_IS_WEB = false;
var ENVIRONMENT_IS_WORKER = false;
var ENVIRONMENT_IS_NODE = false;
var ENVIRONMENT_IS_SHELL = false;
ENVIRONMENT_IS_WEB = typeof window === "object";
ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
var scriptDirectory = "";
function locateFile(path) {
 if (Module["locateFile"]) {
  return Module["locateFile"](path, scriptDirectory);
 } else {
  return scriptDirectory + path;
 }
}
if (ENVIRONMENT_IS_NODE) {
 scriptDirectory = __dirname + "/";
 var nodeFS;
 var nodePath;
 Module["read"] = function shell_read(filename, binary) {
  var ret;
  ret = tryParseAsDataURI(filename);
  if (!ret) {
   if (!nodeFS) nodeFS = require("fs");
   if (!nodePath) nodePath = require("path");
   filename = nodePath["normalize"](filename);
   ret = nodeFS["readFileSync"](filename);
  }
  return binary ? ret : ret.toString();
 };
 Module["readBinary"] = function readBinary(filename) {
  var ret = Module["read"](filename, true);
  if (!ret.buffer) {
   ret = new Uint8Array(ret);
  }
  assert(ret.buffer);
  return ret;
 };
 if (process["argv"].length > 1) {
  Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
 }
 Module["arguments"] = process["argv"].slice(2);
 if (typeof module !== "undefined") {
  module["exports"] = Module;
 }
 process["on"]("uncaughtException", (function(ex) {
  if (!(ex instanceof ExitStatus)) {
   throw ex;
  }
 }));
 process["on"]("unhandledRejection", abort);
 Module["quit"] = (function(status) {
  process["exit"](status);
 });
 Module["inspect"] = (function() {
  return "[Emscripten Module object]";
 });
} else if (ENVIRONMENT_IS_SHELL) {
 if (typeof read != "undefined") {
  Module["read"] = function shell_read(f) {
   var data = tryParseAsDataURI(f);
   if (data) {
    return intArrayToString(data);
   }
   return read(f);
  };
 }
 Module["readBinary"] = function readBinary(f) {
  var data;
  data = tryParseAsDataURI(f);
  if (data) {
   return data;
  }
  if (typeof readbuffer === "function") {
   return new Uint8Array(readbuffer(f));
  }
  data = read(f, "binary");
  assert(typeof data === "object");
  return data;
 };
 if (typeof scriptArgs != "undefined") {
  Module["arguments"] = scriptArgs;
 } else if (typeof arguments != "undefined") {
  Module["arguments"] = arguments;
 }
 if (typeof quit === "function") {
  Module["quit"] = (function(status) {
   quit(status);
  });
 }
} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
 if (ENVIRONMENT_IS_WORKER) {
  scriptDirectory = self.location.href;
 } else if (document.currentScript) {
  scriptDirectory = document.currentScript.src;
 }
 if (scriptDirectory.indexOf("blob:") !== 0) {
  scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
 } else {
  scriptDirectory = "";
 }
 Module["read"] = function shell_read(url) {
  try {
   var xhr = new XMLHttpRequest;
   xhr.open("GET", url, false);
   xhr.send(null);
   return xhr.responseText;
  } catch (err) {
   var data = tryParseAsDataURI(url);
   if (data) {
    return intArrayToString(data);
   }
   throw err;
  }
 };
 if (ENVIRONMENT_IS_WORKER) {
  Module["readBinary"] = function readBinary(url) {
   try {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, false);
    xhr.responseType = "arraybuffer";
    xhr.send(null);
    return new Uint8Array(xhr.response);
   } catch (err) {
    var data = tryParseAsDataURI(url);
    if (data) {
     return data;
    }
    throw err;
   }
  };
 }
 Module["readAsync"] = function readAsync(url, onload, onerror) {
  var xhr = new XMLHttpRequest;
  xhr.open("GET", url, true);
  xhr.responseType = "arraybuffer";
  xhr.onload = function xhr_onload() {
   if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
    onload(xhr.response);
    return;
   }
   var data = tryParseAsDataURI(url);
   if (data) {
    onload(data.buffer);
    return;
   }
   onerror();
  };
  xhr.onerror = onerror;
  xhr.send(null);
 };
 Module["setWindowTitle"] = (function(title) {
  document.title = title;
 });
} else {}
var out = Module["print"] || (typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ? print : null);
var err = Module["printErr"] || (typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn.bind(console) || out);
for (key in moduleOverrides) {
 if (moduleOverrides.hasOwnProperty(key)) {
  Module[key] = moduleOverrides[key];
 }
}
moduleOverrides = undefined;
var STACK_ALIGN = 16;
function staticAlloc(size) {
 var ret = STATICTOP;
 STATICTOP = STATICTOP + size + 15 & -16;
 return ret;
}
function dynamicAlloc(size) {
 var ret = HEAP32[DYNAMICTOP_PTR >> 2];
 var end = ret + size + 15 & -16;
 HEAP32[DYNAMICTOP_PTR >> 2] = end;
 if (end >= TOTAL_MEMORY) {
  var success = enlargeMemory();
  if (!success) {
   HEAP32[DYNAMICTOP_PTR >> 2] = ret;
   return 0;
  }
 }
 return ret;
}
function alignMemory(size, factor) {
 if (!factor) factor = STACK_ALIGN;
 var ret = size = Math.ceil(size / factor) * factor;
 return ret;
}
function getNativeTypeSize(type) {
 switch (type) {
 case "i1":
 case "i8":
  return 1;
 case "i16":
  return 2;
 case "i32":
  return 4;
 case "i64":
  return 8;
 case "float":
  return 4;
 case "double":
  return 8;
 default:
  {
   if (type[type.length - 1] === "*") {
    return 4;
   } else if (type[0] === "i") {
    var bits = parseInt(type.substr(1));
    assert(bits % 8 === 0);
    return bits / 8;
   } else {
    return 0;
   }
  }
 }
}
function warnOnce(text) {
 if (!warnOnce.shown) warnOnce.shown = {};
 if (!warnOnce.shown[text]) {
  warnOnce.shown[text] = 1;
  err(text);
 }
}
var jsCallStartIndex = 1;
var functionPointers = new Array(0);
var funcWrappers = {};
function dynCall(sig, ptr, args) {
 if (args && args.length) {
  return Module["dynCall_" + sig].apply(null, [ ptr ].concat(args));
 } else {
  return Module["dynCall_" + sig].call(null, ptr);
 }
}
var GLOBAL_BASE = 8;
var ABORT = false;
var EXITSTATUS = 0;
function assert(condition, text) {
 if (!condition) {
  abort("Assertion failed: " + text);
 }
}
function getCFunc(ident) {
 var func = Module["_" + ident];
 assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
 return func;
}
var JSfuncs = {
 "stackSave": (function() {
  stackSave();
 }),
 "stackRestore": (function() {
  stackRestore();
 }),
 "arrayToC": (function(arr) {
  var ret = stackAlloc(arr.length);
  writeArrayToMemory(arr, ret);
  return ret;
 }),
 "stringToC": (function(str) {
  var ret = 0;
  if (str !== null && str !== undefined && str !== 0) {
   var len = (str.length << 2) + 1;
   ret = stackAlloc(len);
   stringToUTF8(str, ret, len);
  }
  return ret;
 })
};
var toC = {
 "string": JSfuncs["stringToC"],
 "array": JSfuncs["arrayToC"]
};
function ccall(ident, returnType, argTypes, args, opts) {
 function convertReturnValue(ret) {
  if (returnType === "string") return Pointer_stringify(ret);
  if (returnType === "boolean") return Boolean(ret);
  return ret;
 }
 var func = getCFunc(ident);
 var cArgs = [];
 var stack = 0;
 if (args) {
  for (var i = 0; i < args.length; i++) {
   var converter = toC[argTypes[i]];
   if (converter) {
    if (stack === 0) stack = stackSave();
    cArgs[i] = converter(args[i]);
   } else {
    cArgs[i] = args[i];
   }
  }
 }
 var ret = func.apply(null, cArgs);
 ret = convertReturnValue(ret);
 if (stack !== 0) stackRestore(stack);
 return ret;
}
function setValue(ptr, value, type, noSafe) {
 type = type || "i8";
 if (type.charAt(type.length - 1) === "*") type = "i32";
 switch (type) {
 case "i1":
  HEAP8[ptr >> 0] = value;
  break;
 case "i8":
  HEAP8[ptr >> 0] = value;
  break;
 case "i16":
  HEAP16[ptr >> 1] = value;
  break;
 case "i32":
  HEAP32[ptr >> 2] = value;
  break;
 case "i64":
  tempI64 = [ value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / +4294967296) >>> 0 : 0) ], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
  break;
 case "float":
  HEAPF32[ptr >> 2] = value;
  break;
 case "double":
  HEAPF64[ptr >> 3] = value;
  break;
 default:
  abort("invalid type for setValue: " + type);
 }
}
var ALLOC_STATIC = 2;
var ALLOC_NONE = 4;
function Pointer_stringify(ptr, length) {
 if (length === 0 || !ptr) return "";
 var hasUtf = 0;
 var t;
 var i = 0;
 while (1) {
  t = HEAPU8[ptr + i >> 0];
  hasUtf |= t;
  if (t == 0 && !length) break;
  i++;
  if (length && i == length) break;
 }
 if (!length) length = i;
 var ret = "";
 if (hasUtf < 128) {
  var MAX_CHUNK = 1024;
  var curr;
  while (length > 0) {
   curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
   ret = ret ? ret + curr : curr;
   ptr += MAX_CHUNK;
   length -= MAX_CHUNK;
  }
  return ret;
 }
 return UTF8ToString(ptr);
}
var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;
function UTF8ArrayToString(u8Array, idx) {
 var endPtr = idx;
 while (u8Array[endPtr]) ++endPtr;
 if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
  return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
 } else {
  var u0, u1, u2, u3, u4, u5;
  var str = "";
  while (1) {
   u0 = u8Array[idx++];
   if (!u0) return str;
   if (!(u0 & 128)) {
    str += String.fromCharCode(u0);
    continue;
   }
   u1 = u8Array[idx++] & 63;
   if ((u0 & 224) == 192) {
    str += String.fromCharCode((u0 & 31) << 6 | u1);
    continue;
   }
   u2 = u8Array[idx++] & 63;
   if ((u0 & 240) == 224) {
    u0 = (u0 & 15) << 12 | u1 << 6 | u2;
   } else {
    u3 = u8Array[idx++] & 63;
    if ((u0 & 248) == 240) {
     u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3;
    } else {
     u4 = u8Array[idx++] & 63;
     if ((u0 & 252) == 248) {
      u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4;
     } else {
      u5 = u8Array[idx++] & 63;
      u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5;
     }
    }
   }
   if (u0 < 65536) {
    str += String.fromCharCode(u0);
   } else {
    var ch = u0 - 65536;
    str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
   }
  }
 }
}
function UTF8ToString(ptr) {
 return UTF8ArrayToString(HEAPU8, ptr);
}
function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
 if (!(maxBytesToWrite > 0)) return 0;
 var startIdx = outIdx;
 var endIdx = outIdx + maxBytesToWrite - 1;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) {
   var u1 = str.charCodeAt(++i);
   u = 65536 + ((u & 1023) << 10) | u1 & 1023;
  }
  if (u <= 127) {
   if (outIdx >= endIdx) break;
   outU8Array[outIdx++] = u;
  } else if (u <= 2047) {
   if (outIdx + 1 >= endIdx) break;
   outU8Array[outIdx++] = 192 | u >> 6;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 65535) {
   if (outIdx + 2 >= endIdx) break;
   outU8Array[outIdx++] = 224 | u >> 12;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 2097151) {
   if (outIdx + 3 >= endIdx) break;
   outU8Array[outIdx++] = 240 | u >> 18;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else if (u <= 67108863) {
   if (outIdx + 4 >= endIdx) break;
   outU8Array[outIdx++] = 248 | u >> 24;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  } else {
   if (outIdx + 5 >= endIdx) break;
   outU8Array[outIdx++] = 252 | u >> 30;
   outU8Array[outIdx++] = 128 | u >> 24 & 63;
   outU8Array[outIdx++] = 128 | u >> 18 & 63;
   outU8Array[outIdx++] = 128 | u >> 12 & 63;
   outU8Array[outIdx++] = 128 | u >> 6 & 63;
   outU8Array[outIdx++] = 128 | u & 63;
  }
 }
 outU8Array[outIdx] = 0;
 return outIdx - startIdx;
}
function stringToUTF8(str, outPtr, maxBytesToWrite) {
 return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}
function lengthBytesUTF8(str) {
 var len = 0;
 for (var i = 0; i < str.length; ++i) {
  var u = str.charCodeAt(i);
  if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
  if (u <= 127) {
   ++len;
  } else if (u <= 2047) {
   len += 2;
  } else if (u <= 65535) {
   len += 3;
  } else if (u <= 2097151) {
   len += 4;
  } else if (u <= 67108863) {
   len += 5;
  } else {
   len += 6;
  }
 }
 return len;
}
var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;
function demangle(func) {
 return func;
}
function demangleAll(text) {
 var regex = /__Z[\w\d_]+/g;
 return text.replace(regex, (function(x) {
  var y = demangle(x);
  return x === y ? x : y + " [" + x + "]";
 }));
}
function jsStackTrace() {
 var err = new Error;
 if (!err.stack) {
  try {
   throw new Error(0);
  } catch (e) {
   err = e;
  }
  if (!err.stack) {
   return "(no stack trace available)";
  }
 }
 return err.stack.toString();
}
var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
function updateGlobalBufferViews() {
 Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
 Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
 Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
 Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
 Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
 Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
 Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
 Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
}
var STATIC_BASE, STATICTOP, staticSealed;
var STACK_BASE, STACKTOP, STACK_MAX;
var DYNAMIC_BASE, DYNAMICTOP_PTR;
STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
staticSealed = false;
function abortOnCannotGrowMemory() {
 abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
}
function enlargeMemory() {
 abortOnCannotGrowMemory();
}
var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
if (TOTAL_MEMORY < TOTAL_STACK) err("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
if (Module["buffer"]) {
 buffer = Module["buffer"];
} else {
 {
  buffer = new ArrayBuffer(TOTAL_MEMORY);
 }
 Module["buffer"] = buffer;
}
updateGlobalBufferViews();
function getTotalMemory() {
 return TOTAL_MEMORY;
}
function callRuntimeCallbacks(callbacks) {
 while (callbacks.length > 0) {
  var callback = callbacks.shift();
  if (typeof callback == "function") {
   callback();
   continue;
  }
  var func = callback.func;
  if (typeof func === "number") {
   if (callback.arg === undefined) {
    Module["dynCall_v"](func);
   } else {
    Module["dynCall_vi"](func, callback.arg);
   }
  } else {
   func(callback.arg === undefined ? null : callback.arg);
  }
 }
}
var __ATPRERUN__ = [];
var __ATINIT__ = [];
var __ATMAIN__ = [];
var __ATEXIT__ = [];
var __ATPOSTRUN__ = [];
var runtimeInitialized = false;
var runtimeExited = false;
function preRun() {
 if (Module["preRun"]) {
  if (typeof Module["preRun"] == "function") Module["preRun"] = [ Module["preRun"] ];
  while (Module["preRun"].length) {
   addOnPreRun(Module["preRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPRERUN__);
}
function ensureInitRuntime() {
 if (runtimeInitialized) return;
 runtimeInitialized = true;
 callRuntimeCallbacks(__ATINIT__);
}
function preMain() {
 callRuntimeCallbacks(__ATMAIN__);
}
function exitRuntime() {
 callRuntimeCallbacks(__ATEXIT__);
 runtimeExited = true;
}
function postRun() {
 if (Module["postRun"]) {
  if (typeof Module["postRun"] == "function") Module["postRun"] = [ Module["postRun"] ];
  while (Module["postRun"].length) {
   addOnPostRun(Module["postRun"].shift());
  }
 }
 callRuntimeCallbacks(__ATPOSTRUN__);
}
function addOnPreRun(cb) {
 __ATPRERUN__.unshift(cb);
}
function addOnPostRun(cb) {
 __ATPOSTRUN__.unshift(cb);
}
function writeArrayToMemory(array, buffer) {
 HEAP8.set(array, buffer);
}
function writeAsciiToMemory(str, buffer, dontAddNull) {
 for (var i = 0; i < str.length; ++i) {
  HEAP8[buffer++ >> 0] = str.charCodeAt(i);
 }
 if (!dontAddNull) HEAP8[buffer >> 0] = 0;
}
var Math_abs = Math.abs;
var Math_ceil = Math.ceil;
var Math_floor = Math.floor;
var Math_min = Math.min;
var runDependencies = 0;
var runDependencyWatcher = null;
var dependenciesFulfilled = null;
function addRunDependency(id) {
 runDependencies++;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
}
function removeRunDependency(id) {
 runDependencies--;
 if (Module["monitorRunDependencies"]) {
  Module["monitorRunDependencies"](runDependencies);
 }
 if (runDependencies == 0) {
  if (runDependencyWatcher !== null) {
   clearInterval(runDependencyWatcher);
   runDependencyWatcher = null;
  }
  if (dependenciesFulfilled) {
   var callback = dependenciesFulfilled;
   dependenciesFulfilled = null;
   callback();
  }
 }
}
Module["preloadedImages"] = {};
Module["preloadedAudios"] = {};
var memoryInitializer = null;
var dataURIPrefix = "data:application/octet-stream;base64,";
function isDataURI(filename) {
 return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0;
}
STATIC_BASE = GLOBAL_BASE;
STATICTOP = STATIC_BASE + 33088;
__ATINIT__.push();
memoryInitializer = "data:application/octet-stream;base64,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";
var tempDoublePtr = STATICTOP;
STATICTOP += 16;
function _llvm_stackrestore(p) {
 var self = _llvm_stacksave;
 var ret = self.LLVM_SAVEDSTACKS[p];
 self.LLVM_SAVEDSTACKS.splice(p, 1);
 stackRestore(ret);
}
function _llvm_stacksave() {
 var self = _llvm_stacksave;
 if (!self.LLVM_SAVEDSTACKS) {
  self.LLVM_SAVEDSTACKS = [];
 }
 self.LLVM_SAVEDSTACKS.push(stackSave());
 return self.LLVM_SAVEDSTACKS.length - 1;
}
function _emscripten_memcpy_big(dest, src, num) {
 HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
 return dest;
}
function ___setErrNo(value) {
 if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
 return value;
}
DYNAMICTOP_PTR = staticAlloc(4);
STACK_BASE = STACKTOP = alignMemory(STATICTOP);
STACK_MAX = STACK_BASE + TOTAL_STACK;
DYNAMIC_BASE = alignMemory(STACK_MAX);
HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
staticSealed = true;
var ASSERTIONS = false;
function intArrayToString(array) {
 var ret = [];
 for (var i = 0; i < array.length; i++) {
  var chr = array[i];
  if (chr > 255) {
   if (ASSERTIONS) {
    assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i + " not in 0x00-0xFF.");
   }
   chr &= 255;
  }
  ret.push(String.fromCharCode(chr));
 }
 return ret.join("");
}
var decodeBase64 = typeof atob === "function" ? atob : (function(input) {
 var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
 var output = "";
 var chr1, chr2, chr3;
 var enc1, enc2, enc3, enc4;
 var i = 0;
 input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
 do {
  enc1 = keyStr.indexOf(input.charAt(i++));
  enc2 = keyStr.indexOf(input.charAt(i++));
  enc3 = keyStr.indexOf(input.charAt(i++));
  enc4 = keyStr.indexOf(input.charAt(i++));
  chr1 = enc1 << 2 | enc2 >> 4;
  chr2 = (enc2 & 15) << 4 | enc3 >> 2;
  chr3 = (enc3 & 3) << 6 | enc4;
  output = output + String.fromCharCode(chr1);
  if (enc3 !== 64) {
   output = output + String.fromCharCode(chr2);
  }
  if (enc4 !== 64) {
   output = output + String.fromCharCode(chr3);
  }
 } while (i < input.length);
 return output;
});
function intArrayFromBase64(s) {
 if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
  var buf;
  try {
   buf = Buffer.from(s, "base64");
  } catch (_) {
   buf = new Buffer(s, "base64");
  }
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
 }
 try {
  var decoded = decodeBase64(s);
  var bytes = new Uint8Array(decoded.length);
  for (var i = 0; i < decoded.length; ++i) {
   bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
 } catch (_) {
  throw new Error("Converting base64 string to bytes failed.");
 }
}
function tryParseAsDataURI(filename) {
 if (!isDataURI(filename)) {
  return;
 }
 return intArrayFromBase64(filename.slice(dataURIPrefix.length));
}
Module.asmGlobalArg = {
 "Math": Math,
 "Int8Array": Int8Array,
 "Int16Array": Int16Array,
 "Int32Array": Int32Array,
 "Uint8Array": Uint8Array,
 "Uint16Array": Uint16Array,
 "Uint32Array": Uint32Array,
 "Float32Array": Float32Array,
 "Float64Array": Float64Array,
 "NaN": NaN,
 "Infinity": Infinity
};
Module.asmLibraryArg = {
 "abort": abort,
 "assert": assert,
 "enlargeMemory": enlargeMemory,
 "getTotalMemory": getTotalMemory,
 "abortOnCannotGrowMemory": abortOnCannotGrowMemory,
 "___setErrNo": ___setErrNo,
 "_emscripten_memcpy_big": _emscripten_memcpy_big,
 "_llvm_stackrestore": _llvm_stackrestore,
 "_llvm_stacksave": _llvm_stacksave,
 "DYNAMICTOP_PTR": DYNAMICTOP_PTR,
 "tempDoublePtr": tempDoublePtr,
 "STACKTOP": STACKTOP,
 "STACK_MAX": STACK_MAX
};
// EMSCRIPTEN_START_ASM

var asm = (/** @suppress {uselessCode} */ function(global,env,buffer) {

 "use asm";
 var a = new global.Int8Array(buffer);
 var b = new global.Int16Array(buffer);
 var c = new global.Int32Array(buffer);
 var d = new global.Uint8Array(buffer);
 var e = new global.Uint16Array(buffer);
 var f = new global.Uint32Array(buffer);
 var g = new global.Float32Array(buffer);
 var h = new global.Float64Array(buffer);
 var i = env.DYNAMICTOP_PTR | 0;
 var j = env.tempDoublePtr | 0;
 var k = env.STACKTOP | 0;
 var l = env.STACK_MAX | 0;
 var m = 0;
 var n = 0;
 var o = 0;
 var p = 0;
 var q = global.NaN, r = global.Infinity;
 var s = 0, t = 0, u = 0, v = 0, w = 0.0;
 var x = 0;
 var y = global.Math.floor;
 var z = global.Math.abs;
 var A = global.Math.sqrt;
 var B = global.Math.pow;
 var C = global.Math.cos;
 var D = global.Math.sin;
 var E = global.Math.tan;
 var F = global.Math.acos;
 var G = global.Math.asin;
 var H = global.Math.atan;
 var I = global.Math.atan2;
 var J = global.Math.exp;
 var K = global.Math.log;
 var L = global.Math.ceil;
 var M = global.Math.imul;
 var N = global.Math.min;
 var O = global.Math.max;
 var P = global.Math.clz32;
 var Q = env.abort;
 var R = env.assert;
 var S = env.enlargeMemory;
 var T = env.getTotalMemory;
 var U = env.abortOnCannotGrowMemory;
 var V = env.___setErrNo;
 var W = env._emscripten_memcpy_big;
 var X = env._llvm_stackrestore;
 var Y = env._llvm_stacksave;
 var Z = 0.0;
 
// EMSCRIPTEN_START_FUNCS

function sb(b, c, d, e) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0, La = 0, Ma = 0, Na = 0, Oa = 0, Pa = 0, Qa = 0, Ra = 0, Sa = 0, Ta = 0, Ua = 0, Va = 0, Wa = 0, Xa = 0, Ya = 0, Za = 0, _a = 0, $a = 0, ab = 0, bb = 0, cb = 0, db = 0, eb = 0, fb = 0, gb = 0, hb = 0, ib = 0, jb = 0, kb = 0, lb = 0, mb = 0, nb = 0, ob = 0, pb = 0, qb = 0, rb = 0, sb = 0, vb = 0, wb = 0, xb = 0, yb = 0, zb = 0, Ab = 0, Bb = 0, Cb = 0, Db = 0, Eb = 0, Fb = 0, Gb = 0, Hb = 0, Ib = 0, Jb = 0, Kb = 0, Lb = 0, Sb = 0, Tb = 0, Ub = 0, Vb = 0, Wb = 0, Xb = 0, Yb = 0, Zb = 0, _b = 0, $b = 0, ac = 0, bc = 0, cc = 0, dc = 0, ec = 0, fc = 0, gc = 0, hc = 0, ic = 0, jc = 0, kc = 0, lc = 0, mc = 0, nc = 0, oc = 0, pc = 0, qc = 0, rc = 0, sc = 0, tc = 0, uc = 0, vc = 0, wc = 0, xc = 0, yc = 0, zc = 0, Ac = 0;
 nb = c + 2 | 0;
 $a = tb(a[c >> 0] | 0, a[c + 1 >> 0] | 0, a[nb >> 0] | 0) | 0;
 $a = $a & 2097151;
 nb = ub(nb) | 0;
 nb = Ob(nb | 0, x | 0, 5) | 0;
 nb = nb & 2097151;
 mb = c + 7 | 0;
 eb = tb(a[c + 5 >> 0] | 0, a[c + 6 >> 0] | 0, a[mb >> 0] | 0) | 0;
 eb = Ob(eb | 0, x | 0, 2) | 0;
 eb = eb & 2097151;
 mb = ub(mb) | 0;
 mb = Ob(mb | 0, x | 0, 7) | 0;
 mb = mb & 2097151;
 _a = ub(c + 10 | 0) | 0;
 _a = Ob(_a | 0, x | 0, 4) | 0;
 _a = _a & 2097151;
 na = c + 15 | 0;
 R = tb(a[c + 13 >> 0] | 0, a[c + 14 >> 0] | 0, a[na >> 0] | 0) | 0;
 R = Ob(R | 0, x | 0, 1) | 0;
 R = R & 2097151;
 na = ub(na) | 0;
 na = Ob(na | 0, x | 0, 6) | 0;
 na = na & 2097151;
 k = tb(a[c + 18 >> 0] | 0, a[c + 19 >> 0] | 0, a[c + 20 >> 0] | 0) | 0;
 k = Ob(k | 0, x | 0, 3) | 0;
 k = k & 2097151;
 I = c + 23 | 0;
 Q = tb(a[c + 21 >> 0] | 0, a[c + 22 >> 0] | 0, a[I >> 0] | 0) | 0;
 Q = Q & 2097151;
 I = ub(I) | 0;
 I = Ob(I | 0, x | 0, 5) | 0;
 I = I & 2097151;
 pa = c + 28 | 0;
 la = tb(a[c + 26 >> 0] | 0, a[c + 27 >> 0] | 0, a[pa >> 0] | 0) | 0;
 la = Ob(la | 0, x | 0, 2) | 0;
 la = la & 2097151;
 pa = ub(pa) | 0;
 pa = Ob(pa | 0, x | 0, 7) | 0;
 qa = x;
 M = d + 2 | 0;
 yb = tb(a[d >> 0] | 0, a[d + 1 >> 0] | 0, a[M >> 0] | 0) | 0;
 yb = yb & 2097151;
 M = ub(M) | 0;
 M = Ob(M | 0, x | 0, 5) | 0;
 M = M & 2097151;
 r = d + 7 | 0;
 Ya = tb(a[d + 5 >> 0] | 0, a[d + 6 >> 0] | 0, a[r >> 0] | 0) | 0;
 Ya = Ob(Ya | 0, x | 0, 2) | 0;
 Ya = Ya & 2097151;
 r = ub(r) | 0;
 r = Ob(r | 0, x | 0, 7) | 0;
 r = r & 2097151;
 j = ub(d + 10 | 0) | 0;
 j = Ob(j | 0, x | 0, 4) | 0;
 j = j & 2097151;
 w = d + 15 | 0;
 G = tb(a[d + 13 >> 0] | 0, a[d + 14 >> 0] | 0, a[w >> 0] | 0) | 0;
 G = Ob(G | 0, x | 0, 1) | 0;
 G = G & 2097151;
 w = ub(w) | 0;
 w = Ob(w | 0, x | 0, 6) | 0;
 w = w & 2097151;
 Ra = tb(a[d + 18 >> 0] | 0, a[d + 19 >> 0] | 0, a[d + 20 >> 0] | 0) | 0;
 Ra = Ob(Ra | 0, x | 0, 3) | 0;
 Ra = Ra & 2097151;
 v = d + 23 | 0;
 za = tb(a[d + 21 >> 0] | 0, a[d + 22 >> 0] | 0, a[v >> 0] | 0) | 0;
 za = za & 2097151;
 v = ub(v) | 0;
 v = Ob(v | 0, x | 0, 5) | 0;
 v = v & 2097151;
 U = d + 28 | 0;
 vb = tb(a[d + 26 >> 0] | 0, a[d + 27 >> 0] | 0, a[U >> 0] | 0) | 0;
 vb = Ob(vb | 0, x | 0, 2) | 0;
 vb = vb & 2097151;
 U = ub(U) | 0;
 U = Ob(U | 0, x | 0, 7) | 0;
 T = x;
 ea = e + 2 | 0;
 Ca = tb(a[e >> 0] | 0, a[e + 1 >> 0] | 0, a[ea >> 0] | 0) | 0;
 ea = ub(ea) | 0;
 ea = Ob(ea | 0, x | 0, 5) | 0;
 wa = e + 7 | 0;
 Ga = tb(a[e + 5 >> 0] | 0, a[e + 6 >> 0] | 0, a[wa >> 0] | 0) | 0;
 Ga = Ob(Ga | 0, x | 0, 2) | 0;
 wa = ub(wa) | 0;
 wa = Ob(wa | 0, x | 0, 7) | 0;
 ya = ub(e + 10 | 0) | 0;
 ya = Ob(ya | 0, x | 0, 4) | 0;
 hb = e + 15 | 0;
 Ha = tb(a[e + 13 >> 0] | 0, a[e + 14 >> 0] | 0, a[hb >> 0] | 0) | 0;
 Ha = Ob(Ha | 0, x | 0, 1) | 0;
 hb = ub(hb) | 0;
 hb = Ob(hb | 0, x | 0, 6) | 0;
 ja = tb(a[e + 18 >> 0] | 0, a[e + 19 >> 0] | 0, a[e + 20 >> 0] | 0) | 0;
 ja = Ob(ja | 0, x | 0, 3) | 0;
 ua = e + 23 | 0;
 X = tb(a[e + 21 >> 0] | 0, a[e + 22 >> 0] | 0, a[ua >> 0] | 0) | 0;
 ua = ub(ua) | 0;
 ua = Ob(ua | 0, x | 0, 5) | 0;
 cb = e + 28 | 0;
 aa = tb(a[e + 26 >> 0] | 0, a[e + 27 >> 0] | 0, a[cb >> 0] | 0) | 0;
 aa = Ob(aa | 0, x | 0, 2) | 0;
 cb = ub(cb) | 0;
 cb = Ob(cb | 0, x | 0, 7) | 0;
 ib = x;
 Ba = Mb(yb | 0, 0, $a | 0, 0) | 0;
 Ba = Qb(Ca & 2097151 | 0, 0, Ba | 0, x | 0) | 0;
 Ca = x;
 zc = Mb(M | 0, 0, $a | 0, 0) | 0;
 yc = x;
 xc = Mb(yb | 0, 0, nb | 0, 0) | 0;
 da = x;
 ha = Mb(Ya | 0, 0, $a | 0, 0) | 0;
 Fa = x;
 ia = Mb(M | 0, 0, nb | 0, 0) | 0;
 sc = x;
 va = Mb(yb | 0, 0, eb | 0, 0) | 0;
 va = Qb(ia | 0, sc | 0, va | 0, x | 0) | 0;
 Fa = Qb(va | 0, x | 0, ha | 0, Fa | 0) | 0;
 Ga = Qb(Fa | 0, x | 0, Ga & 2097151 | 0, 0) | 0;
 Fa = x;
 ha = Mb(r | 0, 0, $a | 0, 0) | 0;
 va = x;
 sc = Mb(Ya | 0, 0, nb | 0, 0) | 0;
 ia = x;
 wc = Mb(M | 0, 0, eb | 0, 0) | 0;
 vc = x;
 uc = Mb(yb | 0, 0, mb | 0, 0) | 0;
 tc = x;
 S = Mb(j | 0, 0, $a | 0, 0) | 0;
 xa = x;
 jc = Mb(r | 0, 0, nb | 0, 0) | 0;
 Ia = x;
 lc = Mb(Ya | 0, 0, eb | 0, 0) | 0;
 B = x;
 mc = Mb(M | 0, 0, mb | 0, 0) | 0;
 nc = x;
 kc = Mb(yb | 0, 0, _a | 0, 0) | 0;
 kc = Qb(mc | 0, nc | 0, kc | 0, x | 0) | 0;
 B = Qb(kc | 0, x | 0, lc | 0, B | 0) | 0;
 Ia = Qb(B | 0, x | 0, jc | 0, Ia | 0) | 0;
 xa = Qb(Ia | 0, x | 0, S | 0, xa | 0) | 0;
 ya = Qb(xa | 0, x | 0, ya & 2097151 | 0, 0) | 0;
 xa = x;
 S = Mb(G | 0, 0, $a | 0, 0) | 0;
 Ia = x;
 jc = Mb(j | 0, 0, nb | 0, 0) | 0;
 B = x;
 lc = Mb(r | 0, 0, eb | 0, 0) | 0;
 kc = x;
 nc = Mb(Ya | 0, 0, mb | 0, 0) | 0;
 mc = x;
 rc = Mb(M | 0, 0, _a | 0, 0) | 0;
 qc = x;
 pc = Mb(yb | 0, 0, R | 0, 0) | 0;
 oc = x;
 f = Mb(w | 0, 0, $a | 0, 0) | 0;
 bb = x;
 Yb = Mb(G | 0, 0, nb | 0, 0) | 0;
 ka = x;
 _b = Mb(j | 0, 0, eb | 0, 0) | 0;
 A = x;
 ac = Mb(r | 0, 0, mb | 0, 0) | 0;
 Zb = x;
 cc = Mb(Ya | 0, 0, _a | 0, 0) | 0;
 $b = x;
 dc = Mb(M | 0, 0, R | 0, 0) | 0;
 ec = x;
 bc = Mb(yb | 0, 0, na | 0, 0) | 0;
 bc = Qb(dc | 0, ec | 0, bc | 0, x | 0) | 0;
 $b = Qb(bc | 0, x | 0, cc | 0, $b | 0) | 0;
 Zb = Qb($b | 0, x | 0, ac | 0, Zb | 0) | 0;
 A = Qb(Zb | 0, x | 0, _b | 0, A | 0) | 0;
 ka = Qb(A | 0, x | 0, Yb | 0, ka | 0) | 0;
 bb = Qb(ka | 0, x | 0, f | 0, bb | 0) | 0;
 hb = Qb(bb | 0, x | 0, hb & 2097151 | 0, 0) | 0;
 bb = x;
 f = Mb(Ra | 0, 0, $a | 0, 0) | 0;
 ka = x;
 Yb = Mb(w | 0, 0, nb | 0, 0) | 0;
 A = x;
 _b = Mb(G | 0, 0, eb | 0, 0) | 0;
 Zb = x;
 ac = Mb(j | 0, 0, mb | 0, 0) | 0;
 $b = x;
 cc = Mb(r | 0, 0, _a | 0, 0) | 0;
 bc = x;
 ec = Mb(Ya | 0, 0, R | 0, 0) | 0;
 dc = x;
 ic = Mb(M | 0, 0, na | 0, 0) | 0;
 hc = x;
 gc = Mb(yb | 0, 0, k | 0, 0) | 0;
 fc = x;
 p = Mb(za | 0, 0, $a | 0, 0) | 0;
 Y = x;
 Bb = Mb(Ra | 0, 0, nb | 0, 0) | 0;
 ta = x;
 Db = Mb(w | 0, 0, eb | 0, 0) | 0;
 $ = x;
 Fb = Mb(G | 0, 0, mb | 0, 0) | 0;
 Cb = x;
 Hb = Mb(j | 0, 0, _a | 0, 0) | 0;
 Eb = x;
 Jb = Mb(r | 0, 0, R | 0, 0) | 0;
 Gb = x;
 Lb = Mb(Ya | 0, 0, na | 0, 0) | 0;
 Ib = x;
 Sb = Mb(M | 0, 0, k | 0, 0) | 0;
 Tb = x;
 Kb = Mb(yb | 0, 0, Q | 0, 0) | 0;
 Kb = Qb(Sb | 0, Tb | 0, Kb | 0, x | 0) | 0;
 Ib = Qb(Kb | 0, x | 0, Lb | 0, Ib | 0) | 0;
 Gb = Qb(Ib | 0, x | 0, Jb | 0, Gb | 0) | 0;
 Eb = Qb(Gb | 0, x | 0, Hb | 0, Eb | 0) | 0;
 Cb = Qb(Eb | 0, x | 0, Fb | 0, Cb | 0) | 0;
 $ = Qb(Cb | 0, x | 0, Db | 0, $ | 0) | 0;
 ta = Qb($ | 0, x | 0, Bb | 0, ta | 0) | 0;
 Y = Qb(ta | 0, x | 0, p | 0, Y | 0) | 0;
 X = Qb(Y | 0, x | 0, X & 2097151 | 0, 0) | 0;
 Y = x;
 p = Mb(v | 0, 0, $a | 0, 0) | 0;
 ta = x;
 Bb = Mb(za | 0, 0, nb | 0, 0) | 0;
 $ = x;
 Db = Mb(Ra | 0, 0, eb | 0, 0) | 0;
 Cb = x;
 Fb = Mb(w | 0, 0, mb | 0, 0) | 0;
 Eb = x;
 Hb = Mb(G | 0, 0, _a | 0, 0) | 0;
 Gb = x;
 Jb = Mb(j | 0, 0, R | 0, 0) | 0;
 Ib = x;
 Lb = Mb(r | 0, 0, na | 0, 0) | 0;
 Kb = x;
 Tb = Mb(Ya | 0, 0, k | 0, 0) | 0;
 Sb = x;
 Xb = Mb(M | 0, 0, Q | 0, 0) | 0;
 Wb = x;
 Vb = Mb(yb | 0, 0, I | 0, 0) | 0;
 Ub = x;
 ab = Mb(vb | 0, 0, $a | 0, 0) | 0;
 ba = x;
 Ma = Mb(v | 0, 0, nb | 0, 0) | 0;
 La = x;
 Ja = Mb(za | 0, 0, eb | 0, 0) | 0;
 Ka = x;
 qb = Mb(Ra | 0, 0, mb | 0, 0) | 0;
 pb = x;
 t = Mb(w | 0, 0, _a | 0, 0) | 0;
 i = x;
 Qa = Mb(G | 0, 0, R | 0, 0) | 0;
 Pa = x;
 gb = Mb(j | 0, 0, na | 0, 0) | 0;
 fb = x;
 c = Mb(r | 0, 0, k | 0, 0) | 0;
 e = x;
 Wa = Mb(Ya | 0, 0, Q | 0, 0) | 0;
 Va = x;
 Ab = Mb(M | 0, 0, I | 0, 0) | 0;
 ra = x;
 ma = Mb(yb | 0, 0, la | 0, 0) | 0;
 ma = Qb(Ab | 0, ra | 0, ma | 0, x | 0) | 0;
 Va = Qb(ma | 0, x | 0, Wa | 0, Va | 0) | 0;
 e = Qb(Va | 0, x | 0, c | 0, e | 0) | 0;
 fb = Qb(e | 0, x | 0, gb | 0, fb | 0) | 0;
 Pa = Qb(fb | 0, x | 0, Qa | 0, Pa | 0) | 0;
 i = Qb(Pa | 0, x | 0, t | 0, i | 0) | 0;
 pb = Qb(i | 0, x | 0, qb | 0, pb | 0) | 0;
 Ka = Qb(pb | 0, x | 0, Ja | 0, Ka | 0) | 0;
 La = Qb(Ka | 0, x | 0, Ma | 0, La | 0) | 0;
 ba = Qb(La | 0, x | 0, ab | 0, ba | 0) | 0;
 aa = Qb(ba | 0, x | 0, aa & 2097151 | 0, 0) | 0;
 ba = x;
 $a = Mb(U | 0, T | 0, $a | 0, 0) | 0;
 ab = x;
 La = Mb(vb | 0, 0, nb | 0, 0) | 0;
 Ma = x;
 Ka = Mb(v | 0, 0, eb | 0, 0) | 0;
 Ja = x;
 pb = Mb(za | 0, 0, mb | 0, 0) | 0;
 qb = x;
 i = Mb(Ra | 0, 0, _a | 0, 0) | 0;
 t = x;
 Pa = Mb(w | 0, 0, R | 0, 0) | 0;
 Qa = x;
 fb = Mb(G | 0, 0, na | 0, 0) | 0;
 gb = x;
 e = Mb(j | 0, 0, k | 0, 0) | 0;
 c = x;
 Va = Mb(r | 0, 0, Q | 0, 0) | 0;
 Wa = x;
 ma = Mb(Ya | 0, 0, I | 0, 0) | 0;
 ra = x;
 Ab = Mb(M | 0, 0, la | 0, 0) | 0;
 zb = x;
 yb = Mb(yb | 0, 0, pa | 0, qa | 0) | 0;
 xb = x;
 nb = Mb(U | 0, T | 0, nb | 0, 0) | 0;
 ob = x;
 _ = Mb(vb | 0, 0, eb | 0, 0) | 0;
 db = x;
 ca = Mb(v | 0, 0, mb | 0, 0) | 0;
 E = x;
 rb = Mb(za | 0, 0, _a | 0, 0) | 0;
 Na = x;
 y = Mb(Ra | 0, 0, R | 0, 0) | 0;
 sb = x;
 K = Mb(w | 0, 0, na | 0, 0) | 0;
 N = x;
 Oa = Mb(G | 0, 0, k | 0, 0) | 0;
 J = x;
 V = Mb(j | 0, 0, Q | 0, 0) | 0;
 C = x;
 L = Mb(r | 0, 0, I | 0, 0) | 0;
 W = x;
 lb = Mb(Ya | 0, 0, la | 0, 0) | 0;
 Xa = x;
 M = Mb(M | 0, 0, pa | 0, qa | 0) | 0;
 M = Qb(lb | 0, Xa | 0, M | 0, x | 0) | 0;
 W = Qb(M | 0, x | 0, L | 0, W | 0) | 0;
 C = Qb(W | 0, x | 0, V | 0, C | 0) | 0;
 J = Qb(C | 0, x | 0, Oa | 0, J | 0) | 0;
 N = Qb(J | 0, x | 0, K | 0, N | 0) | 0;
 sb = Qb(N | 0, x | 0, y | 0, sb | 0) | 0;
 Na = Qb(sb | 0, x | 0, rb | 0, Na | 0) | 0;
 E = Qb(Na | 0, x | 0, ca | 0, E | 0) | 0;
 db = Qb(E | 0, x | 0, _ | 0, db | 0) | 0;
 ob = Qb(db | 0, x | 0, nb | 0, ob | 0) | 0;
 nb = x;
 eb = Mb(U | 0, T | 0, eb | 0, 0) | 0;
 db = x;
 _ = Mb(vb | 0, 0, mb | 0, 0) | 0;
 E = x;
 ca = Mb(v | 0, 0, _a | 0, 0) | 0;
 Na = x;
 rb = Mb(za | 0, 0, R | 0, 0) | 0;
 sb = x;
 y = Mb(Ra | 0, 0, na | 0, 0) | 0;
 N = x;
 K = Mb(w | 0, 0, k | 0, 0) | 0;
 J = x;
 Oa = Mb(G | 0, 0, Q | 0, 0) | 0;
 C = x;
 V = Mb(j | 0, 0, I | 0, 0) | 0;
 W = x;
 L = Mb(r | 0, 0, la | 0, 0) | 0;
 M = x;
 Ya = Mb(Ya | 0, 0, pa | 0, qa | 0) | 0;
 Xa = x;
 mb = Mb(U | 0, T | 0, mb | 0, 0) | 0;
 lb = x;
 jb = Mb(vb | 0, 0, _a | 0, 0) | 0;
 Za = x;
 P = Mb(v | 0, 0, R | 0, 0) | 0;
 kb = x;
 F = Mb(za | 0, 0, na | 0, 0) | 0;
 O = x;
 ga = Mb(Ra | 0, 0, k | 0, 0) | 0;
 d = x;
 u = Mb(w | 0, 0, Q | 0, 0) | 0;
 fa = x;
 m = Mb(G | 0, 0, I | 0, 0) | 0;
 h = x;
 wb = Mb(j | 0, 0, la | 0, 0) | 0;
 g = x;
 r = Mb(r | 0, 0, pa | 0, qa | 0) | 0;
 r = Qb(wb | 0, g | 0, r | 0, x | 0) | 0;
 h = Qb(r | 0, x | 0, m | 0, h | 0) | 0;
 fa = Qb(h | 0, x | 0, u | 0, fa | 0) | 0;
 d = Qb(fa | 0, x | 0, ga | 0, d | 0) | 0;
 O = Qb(d | 0, x | 0, F | 0, O | 0) | 0;
 kb = Qb(O | 0, x | 0, P | 0, kb | 0) | 0;
 Za = Qb(kb | 0, x | 0, jb | 0, Za | 0) | 0;
 lb = Qb(Za | 0, x | 0, mb | 0, lb | 0) | 0;
 mb = x;
 _a = Mb(U | 0, T | 0, _a | 0, 0) | 0;
 Za = x;
 jb = Mb(vb | 0, 0, R | 0, 0) | 0;
 kb = x;
 P = Mb(v | 0, 0, na | 0, 0) | 0;
 O = x;
 F = Mb(za | 0, 0, k | 0, 0) | 0;
 d = x;
 ga = Mb(Ra | 0, 0, Q | 0, 0) | 0;
 fa = x;
 u = Mb(w | 0, 0, I | 0, 0) | 0;
 h = x;
 m = Mb(G | 0, 0, la | 0, 0) | 0;
 r = x;
 j = Mb(j | 0, 0, pa | 0, qa | 0) | 0;
 g = x;
 R = Mb(U | 0, T | 0, R | 0, 0) | 0;
 wb = x;
 s = Mb(vb | 0, 0, na | 0, 0) | 0;
 oa = x;
 l = Mb(v | 0, 0, k | 0, 0) | 0;
 n = x;
 Ua = Mb(za | 0, 0, Q | 0, 0) | 0;
 q = x;
 H = Mb(Ra | 0, 0, I | 0, 0) | 0;
 Ta = x;
 o = Mb(w | 0, 0, la | 0, 0) | 0;
 z = x;
 G = Mb(G | 0, 0, pa | 0, qa | 0) | 0;
 G = Qb(o | 0, z | 0, G | 0, x | 0) | 0;
 Ta = Qb(G | 0, x | 0, H | 0, Ta | 0) | 0;
 q = Qb(Ta | 0, x | 0, Ua | 0, q | 0) | 0;
 n = Qb(q | 0, x | 0, l | 0, n | 0) | 0;
 oa = Qb(n | 0, x | 0, s | 0, oa | 0) | 0;
 wb = Qb(oa | 0, x | 0, R | 0, wb | 0) | 0;
 R = x;
 na = Mb(U | 0, T | 0, na | 0, 0) | 0;
 oa = x;
 s = Mb(vb | 0, 0, k | 0, 0) | 0;
 n = x;
 l = Mb(v | 0, 0, Q | 0, 0) | 0;
 q = x;
 Ua = Mb(za | 0, 0, I | 0, 0) | 0;
 Ta = x;
 H = Mb(Ra | 0, 0, la | 0, 0) | 0;
 G = x;
 w = Mb(w | 0, 0, pa | 0, qa | 0) | 0;
 z = x;
 k = Mb(U | 0, T | 0, k | 0, 0) | 0;
 o = x;
 Da = Mb(vb | 0, 0, Q | 0, 0) | 0;
 D = x;
 Sa = Mb(v | 0, 0, I | 0, 0) | 0;
 Ea = x;
 Z = Mb(za | 0, 0, la | 0, 0) | 0;
 Aa = x;
 Ra = Mb(Ra | 0, 0, pa | 0, qa | 0) | 0;
 Ra = Qb(Z | 0, Aa | 0, Ra | 0, x | 0) | 0;
 Ea = Qb(Ra | 0, x | 0, Sa | 0, Ea | 0) | 0;
 D = Qb(Ea | 0, x | 0, Da | 0, D | 0) | 0;
 o = Qb(D | 0, x | 0, k | 0, o | 0) | 0;
 k = x;
 Q = Mb(U | 0, T | 0, Q | 0, 0) | 0;
 D = x;
 Da = Mb(vb | 0, 0, I | 0, 0) | 0;
 Ea = x;
 Sa = Mb(v | 0, 0, la | 0, 0) | 0;
 Ra = x;
 za = Mb(za | 0, 0, pa | 0, qa | 0) | 0;
 Aa = x;
 I = Mb(U | 0, T | 0, I | 0, 0) | 0;
 Z = x;
 Ac = Mb(vb | 0, 0, la | 0, 0) | 0;
 sa = x;
 v = Mb(v | 0, 0, pa | 0, qa | 0) | 0;
 v = Qb(Ac | 0, sa | 0, v | 0, x | 0) | 0;
 Z = Qb(v | 0, x | 0, I | 0, Z | 0) | 0;
 I = x;
 la = Mb(U | 0, T | 0, la | 0, 0) | 0;
 v = x;
 vb = Mb(vb | 0, 0, pa | 0, qa | 0) | 0;
 vb = Qb(la | 0, v | 0, vb | 0, x | 0) | 0;
 v = x;
 qa = Mb(U | 0, T | 0, pa | 0, qa | 0) | 0;
 pa = x;
 T = Qb(Ba | 0, Ca | 0, 1048576, 0) | 0;
 U = x;
 la = Ob(T | 0, U | 0, 21) | 0;
 sa = x;
 da = Qb(zc | 0, yc | 0, xc | 0, da | 0) | 0;
 ea = Qb(da | 0, x | 0, ea & 2097151 | 0, 0) | 0;
 sa = Qb(ea | 0, x | 0, la | 0, sa | 0) | 0;
 la = x;
 U = Rb(Ba | 0, Ca | 0, T & -2097152 | 0, U & 4095 | 0) | 0;
 T = x;
 Ca = Qb(Ga | 0, Fa | 0, 1048576, 0) | 0;
 Ba = x;
 ea = Ob(Ca | 0, Ba | 0, 21) | 0;
 da = x;
 tc = Qb(wc | 0, vc | 0, uc | 0, tc | 0) | 0;
 ia = Qb(tc | 0, x | 0, sc | 0, ia | 0) | 0;
 va = Qb(ia | 0, x | 0, ha | 0, va | 0) | 0;
 wa = Qb(va | 0, x | 0, wa & 2097151 | 0, 0) | 0;
 da = Qb(wa | 0, x | 0, ea | 0, da | 0) | 0;
 ea = x;
 wa = Qb(ya | 0, xa | 0, 1048576, 0) | 0;
 va = x;
 ha = Nb(wa | 0, va | 0, 21) | 0;
 ia = x;
 oc = Qb(rc | 0, qc | 0, pc | 0, oc | 0) | 0;
 mc = Qb(oc | 0, x | 0, nc | 0, mc | 0) | 0;
 kc = Qb(mc | 0, x | 0, lc | 0, kc | 0) | 0;
 B = Qb(kc | 0, x | 0, jc | 0, B | 0) | 0;
 Ia = Qb(B | 0, x | 0, S | 0, Ia | 0) | 0;
 Ha = Qb(Ia | 0, x | 0, Ha & 2097151 | 0, 0) | 0;
 ia = Qb(Ha | 0, x | 0, ha | 0, ia | 0) | 0;
 ha = x;
 Ha = Qb(hb | 0, bb | 0, 1048576, 0) | 0;
 Ia = x;
 S = Nb(Ha | 0, Ia | 0, 21) | 0;
 B = x;
 fc = Qb(ic | 0, hc | 0, gc | 0, fc | 0) | 0;
 dc = Qb(fc | 0, x | 0, ec | 0, dc | 0) | 0;
 bc = Qb(dc | 0, x | 0, cc | 0, bc | 0) | 0;
 $b = Qb(bc | 0, x | 0, ac | 0, $b | 0) | 0;
 Zb = Qb($b | 0, x | 0, _b | 0, Zb | 0) | 0;
 A = Qb(Zb | 0, x | 0, Yb | 0, A | 0) | 0;
 ka = Qb(A | 0, x | 0, f | 0, ka | 0) | 0;
 ja = Qb(ka | 0, x | 0, ja & 2097151 | 0, 0) | 0;
 B = Qb(ja | 0, x | 0, S | 0, B | 0) | 0;
 S = x;
 ja = Qb(X | 0, Y | 0, 1048576, 0) | 0;
 ka = x;
 f = Nb(ja | 0, ka | 0, 21) | 0;
 A = x;
 Ub = Qb(Xb | 0, Wb | 0, Vb | 0, Ub | 0) | 0;
 Sb = Qb(Ub | 0, x | 0, Tb | 0, Sb | 0) | 0;
 Kb = Qb(Sb | 0, x | 0, Lb | 0, Kb | 0) | 0;
 Ib = Qb(Kb | 0, x | 0, Jb | 0, Ib | 0) | 0;
 Gb = Qb(Ib | 0, x | 0, Hb | 0, Gb | 0) | 0;
 Eb = Qb(Gb | 0, x | 0, Fb | 0, Eb | 0) | 0;
 Cb = Qb(Eb | 0, x | 0, Db | 0, Cb | 0) | 0;
 $ = Qb(Cb | 0, x | 0, Bb | 0, $ | 0) | 0;
 ta = Qb($ | 0, x | 0, p | 0, ta | 0) | 0;
 ua = Qb(ta | 0, x | 0, ua & 2097151 | 0, 0) | 0;
 A = Qb(ua | 0, x | 0, f | 0, A | 0) | 0;
 f = x;
 ua = Qb(aa | 0, ba | 0, 1048576, 0) | 0;
 ta = x;
 p = Nb(ua | 0, ta | 0, 21) | 0;
 $ = x;
 xb = Qb(Ab | 0, zb | 0, yb | 0, xb | 0) | 0;
 ra = Qb(xb | 0, x | 0, ma | 0, ra | 0) | 0;
 Wa = Qb(ra | 0, x | 0, Va | 0, Wa | 0) | 0;
 c = Qb(Wa | 0, x | 0, e | 0, c | 0) | 0;
 gb = Qb(c | 0, x | 0, fb | 0, gb | 0) | 0;
 Qa = Qb(gb | 0, x | 0, Pa | 0, Qa | 0) | 0;
 t = Qb(Qa | 0, x | 0, i | 0, t | 0) | 0;
 qb = Qb(t | 0, x | 0, pb | 0, qb | 0) | 0;
 Ja = Qb(qb | 0, x | 0, Ka | 0, Ja | 0) | 0;
 ab = Qb(Ja | 0, x | 0, $a | 0, ab | 0) | 0;
 Ma = Qb(ab | 0, x | 0, La | 0, Ma | 0) | 0;
 ib = Qb(Ma | 0, x | 0, cb | 0, ib | 0) | 0;
 $ = Qb(ib | 0, x | 0, p | 0, $ | 0) | 0;
 p = x;
 ib = Qb(ob | 0, nb | 0, 1048576, 0) | 0;
 cb = x;
 Ma = Nb(ib | 0, cb | 0, 21) | 0;
 La = x;
 Xa = Qb(L | 0, M | 0, Ya | 0, Xa | 0) | 0;
 W = Qb(Xa | 0, x | 0, V | 0, W | 0) | 0;
 C = Qb(W | 0, x | 0, Oa | 0, C | 0) | 0;
 J = Qb(C | 0, x | 0, K | 0, J | 0) | 0;
 N = Qb(J | 0, x | 0, y | 0, N | 0) | 0;
 sb = Qb(N | 0, x | 0, rb | 0, sb | 0) | 0;
 Na = Qb(sb | 0, x | 0, ca | 0, Na | 0) | 0;
 E = Qb(Na | 0, x | 0, _ | 0, E | 0) | 0;
 db = Qb(E | 0, x | 0, eb | 0, db | 0) | 0;
 La = Qb(db | 0, x | 0, Ma | 0, La | 0) | 0;
 Ma = x;
 db = Qb(lb | 0, mb | 0, 1048576, 0) | 0;
 eb = x;
 E = Nb(db | 0, eb | 0, 21) | 0;
 _ = x;
 g = Qb(m | 0, r | 0, j | 0, g | 0) | 0;
 h = Qb(g | 0, x | 0, u | 0, h | 0) | 0;
 fa = Qb(h | 0, x | 0, ga | 0, fa | 0) | 0;
 d = Qb(fa | 0, x | 0, F | 0, d | 0) | 0;
 O = Qb(d | 0, x | 0, P | 0, O | 0) | 0;
 kb = Qb(O | 0, x | 0, jb | 0, kb | 0) | 0;
 Za = Qb(kb | 0, x | 0, _a | 0, Za | 0) | 0;
 _ = Qb(Za | 0, x | 0, E | 0, _ | 0) | 0;
 E = x;
 Za = Qb(wb | 0, R | 0, 1048576, 0) | 0;
 _a = x;
 kb = Nb(Za | 0, _a | 0, 21) | 0;
 jb = x;
 z = Qb(H | 0, G | 0, w | 0, z | 0) | 0;
 Ta = Qb(z | 0, x | 0, Ua | 0, Ta | 0) | 0;
 q = Qb(Ta | 0, x | 0, l | 0, q | 0) | 0;
 n = Qb(q | 0, x | 0, s | 0, n | 0) | 0;
 oa = Qb(n | 0, x | 0, na | 0, oa | 0) | 0;
 jb = Qb(oa | 0, x | 0, kb | 0, jb | 0) | 0;
 kb = x;
 oa = Qb(o | 0, k | 0, 1048576, 0) | 0;
 na = x;
 n = Nb(oa | 0, na | 0, 21) | 0;
 s = x;
 Aa = Qb(Sa | 0, Ra | 0, za | 0, Aa | 0) | 0;
 Ea = Qb(Aa | 0, x | 0, Da | 0, Ea | 0) | 0;
 D = Qb(Ea | 0, x | 0, Q | 0, D | 0) | 0;
 s = Qb(D | 0, x | 0, n | 0, s | 0) | 0;
 n = x;
 na = Rb(o | 0, k | 0, oa & -2097152 | 0, na | 0) | 0;
 oa = x;
 k = Qb(Z | 0, I | 0, 1048576, 0) | 0;
 o = x;
 D = Ob(k | 0, o | 0, 21) | 0;
 D = Qb(vb | 0, v | 0, D | 0, x | 0) | 0;
 v = x;
 o = Rb(Z | 0, I | 0, k & -2097152 | 0, o & 2147483647 | 0) | 0;
 k = x;
 I = Qb(qa | 0, pa | 0, 1048576, 0) | 0;
 Z = x;
 vb = Ob(I | 0, Z | 0, 21) | 0;
 Q = x;
 Z = Rb(qa | 0, pa | 0, I & -2097152 | 0, Z & 2147483647 | 0) | 0;
 I = x;
 pa = Qb(sa | 0, la | 0, 1048576, 0) | 0;
 qa = x;
 Ea = Ob(pa | 0, qa | 0, 21) | 0;
 Da = x;
 qa = Rb(sa | 0, la | 0, pa & -2097152 | 0, qa | 0) | 0;
 pa = x;
 la = Qb(da | 0, ea | 0, 1048576, 0) | 0;
 sa = x;
 Aa = Nb(la | 0, sa | 0, 21) | 0;
 za = x;
 sa = Rb(da | 0, ea | 0, la & -2097152 | 0, sa | 0) | 0;
 la = x;
 ea = Qb(ia | 0, ha | 0, 1048576, 0) | 0;
 da = x;
 Ra = Nb(ea | 0, da | 0, 21) | 0;
 Sa = x;
 q = Qb(B | 0, S | 0, 1048576, 0) | 0;
 l = x;
 Ta = Nb(q | 0, l | 0, 21) | 0;
 Ua = x;
 z = Qb(A | 0, f | 0, 1048576, 0) | 0;
 w = x;
 G = Nb(z | 0, w | 0, 21) | 0;
 H = x;
 O = Qb($ | 0, p | 0, 1048576, 0) | 0;
 P = x;
 d = Nb(O | 0, P | 0, 21) | 0;
 F = x;
 fa = Qb(La | 0, Ma | 0, 1048576, 0) | 0;
 ga = x;
 h = Nb(fa | 0, ga | 0, 21) | 0;
 u = x;
 g = Qb(_ | 0, E | 0, 1048576, 0) | 0;
 j = x;
 r = Nb(g | 0, j | 0, 21) | 0;
 m = x;
 Na = Qb(jb | 0, kb | 0, 1048576, 0) | 0;
 ca = x;
 sb = Nb(Na | 0, ca | 0, 21) | 0;
 oa = Qb(sb | 0, x | 0, na | 0, oa | 0) | 0;
 na = x;
 ca = Rb(jb | 0, kb | 0, Na & -2097152 | 0, ca | 0) | 0;
 Na = x;
 kb = Qb(s | 0, n | 0, 1048576, 0) | 0;
 jb = x;
 sb = Nb(kb | 0, jb | 0, 21) | 0;
 k = Qb(sb | 0, x | 0, o | 0, k | 0) | 0;
 o = x;
 jb = Rb(s | 0, n | 0, kb & -2097152 | 0, jb | 0) | 0;
 kb = x;
 n = Qb(D | 0, v | 0, 1048576, 0) | 0;
 s = x;
 sb = Ob(n | 0, s | 0, 21) | 0;
 I = Qb(sb | 0, x | 0, Z | 0, I | 0) | 0;
 Z = x;
 s = Rb(D | 0, v | 0, n & -2097152 | 0, s & 2147483647 | 0) | 0;
 n = x;
 v = Mb(vb | 0, Q | 0, 666643, 0) | 0;
 D = x;
 sb = Mb(vb | 0, Q | 0, 470296, 0) | 0;
 rb = x;
 N = Mb(vb | 0, Q | 0, 654183, 0) | 0;
 y = x;
 J = Mb(vb | 0, Q | 0, -997805, -1) | 0;
 K = x;
 C = Mb(vb | 0, Q | 0, 136657, 0) | 0;
 Oa = x;
 Q = Mb(vb | 0, Q | 0, -683901, -1) | 0;
 Q = Qb(wb | 0, R | 0, Q | 0, x | 0) | 0;
 _a = Rb(Q | 0, x | 0, Za & -2097152 | 0, _a | 0) | 0;
 m = Qb(_a | 0, x | 0, r | 0, m | 0) | 0;
 r = x;
 _a = Mb(I | 0, Z | 0, 666643, 0) | 0;
 Za = x;
 Q = Mb(I | 0, Z | 0, 470296, 0) | 0;
 R = x;
 wb = Mb(I | 0, Z | 0, 654183, 0) | 0;
 vb = x;
 W = Mb(I | 0, Z | 0, -997805, -1) | 0;
 V = x;
 Xa = Mb(I | 0, Z | 0, 136657, 0) | 0;
 Ya = x;
 Z = Mb(I | 0, Z | 0, -683901, -1) | 0;
 I = x;
 M = Mb(s | 0, n | 0, 666643, 0) | 0;
 L = x;
 ab = Mb(s | 0, n | 0, 470296, 0) | 0;
 $a = x;
 Ja = Mb(s | 0, n | 0, 654183, 0) | 0;
 Ka = x;
 qb = Mb(s | 0, n | 0, -997805, -1) | 0;
 pb = x;
 t = Mb(s | 0, n | 0, 136657, 0) | 0;
 i = x;
 n = Mb(s | 0, n | 0, -683901, -1) | 0;
 s = x;
 K = Qb(lb | 0, mb | 0, J | 0, K | 0) | 0;
 Ya = Qb(K | 0, x | 0, Xa | 0, Ya | 0) | 0;
 s = Qb(Ya | 0, x | 0, n | 0, s | 0) | 0;
 eb = Rb(s | 0, x | 0, db & -2097152 | 0, eb | 0) | 0;
 u = Qb(eb | 0, x | 0, h | 0, u | 0) | 0;
 h = x;
 eb = Mb(k | 0, o | 0, 666643, 0) | 0;
 db = x;
 s = Mb(k | 0, o | 0, 470296, 0) | 0;
 n = x;
 Ya = Mb(k | 0, o | 0, 654183, 0) | 0;
 Xa = x;
 K = Mb(k | 0, o | 0, -997805, -1) | 0;
 J = x;
 mb = Mb(k | 0, o | 0, 136657, 0) | 0;
 lb = x;
 o = Mb(k | 0, o | 0, -683901, -1) | 0;
 k = x;
 Qa = Mb(jb | 0, kb | 0, 666643, 0) | 0;
 Pa = x;
 gb = Mb(jb | 0, kb | 0, 470296, 0) | 0;
 fb = x;
 c = Mb(jb | 0, kb | 0, 654183, 0) | 0;
 e = x;
 Wa = Mb(jb | 0, kb | 0, -997805, -1) | 0;
 Va = x;
 ra = Mb(jb | 0, kb | 0, 136657, 0) | 0;
 ma = x;
 kb = Mb(jb | 0, kb | 0, -683901, -1) | 0;
 jb = x;
 rb = Qb(wb | 0, vb | 0, sb | 0, rb | 0) | 0;
 pb = Qb(rb | 0, x | 0, qb | 0, pb | 0) | 0;
 nb = Qb(pb | 0, x | 0, ob | 0, nb | 0) | 0;
 lb = Qb(nb | 0, x | 0, mb | 0, lb | 0) | 0;
 jb = Qb(lb | 0, x | 0, kb | 0, jb | 0) | 0;
 cb = Rb(jb | 0, x | 0, ib & -2097152 | 0, cb | 0) | 0;
 F = Qb(cb | 0, x | 0, d | 0, F | 0) | 0;
 d = x;
 cb = Mb(oa | 0, na | 0, 666643, 0) | 0;
 cb = Qb(hb | 0, bb | 0, cb | 0, x | 0) | 0;
 Sa = Qb(cb | 0, x | 0, Ra | 0, Sa | 0) | 0;
 Ia = Rb(Sa | 0, x | 0, Ha & -2097152 | 0, Ia | 0) | 0;
 Ha = x;
 Sa = Mb(oa | 0, na | 0, 470296, 0) | 0;
 Ra = x;
 cb = Mb(oa | 0, na | 0, 654183, 0) | 0;
 bb = x;
 db = Qb(gb | 0, fb | 0, eb | 0, db | 0) | 0;
 bb = Qb(db | 0, x | 0, cb | 0, bb | 0) | 0;
 Ua = Qb(bb | 0, x | 0, Ta | 0, Ua | 0) | 0;
 Y = Qb(Ua | 0, x | 0, X | 0, Y | 0) | 0;
 ka = Rb(Y | 0, x | 0, ja & -2097152 | 0, ka | 0) | 0;
 ja = x;
 Y = Mb(oa | 0, na | 0, -997805, -1) | 0;
 X = x;
 Ua = Mb(oa | 0, na | 0, 136657, 0) | 0;
 Ta = x;
 Za = Qb(ab | 0, $a | 0, _a | 0, Za | 0) | 0;
 Xa = Qb(Za | 0, x | 0, Ya | 0, Xa | 0) | 0;
 Va = Qb(Xa | 0, x | 0, Wa | 0, Va | 0) | 0;
 Ta = Qb(Va | 0, x | 0, Ua | 0, Ta | 0) | 0;
 H = Qb(Ta | 0, x | 0, G | 0, H | 0) | 0;
 ba = Qb(H | 0, x | 0, aa | 0, ba | 0) | 0;
 ta = Rb(ba | 0, x | 0, ua & -2097152 | 0, ta | 0) | 0;
 ua = x;
 na = Mb(oa | 0, na | 0, -683901, -1) | 0;
 oa = x;
 ba = Qb(Ia | 0, Ha | 0, 1048576, 0) | 0;
 aa = x;
 H = Nb(ba | 0, aa | 0, 21) | 0;
 G = x;
 Pa = Qb(Sa | 0, Ra | 0, Qa | 0, Pa | 0) | 0;
 S = Qb(Pa | 0, x | 0, B | 0, S | 0) | 0;
 G = Qb(S | 0, x | 0, H | 0, G | 0) | 0;
 l = Rb(G | 0, x | 0, q & -2097152 | 0, l | 0) | 0;
 q = x;
 G = Qb(ka | 0, ja | 0, 1048576, 0) | 0;
 H = x;
 S = Nb(G | 0, H | 0, 21) | 0;
 B = x;
 L = Qb(s | 0, n | 0, M | 0, L | 0) | 0;
 e = Qb(L | 0, x | 0, c | 0, e | 0) | 0;
 X = Qb(e | 0, x | 0, Y | 0, X | 0) | 0;
 f = Qb(X | 0, x | 0, A | 0, f | 0) | 0;
 w = Rb(f | 0, x | 0, z & -2097152 | 0, w | 0) | 0;
 B = Qb(w | 0, x | 0, S | 0, B | 0) | 0;
 S = x;
 w = Qb(ta | 0, ua | 0, 1048576, 0) | 0;
 z = x;
 f = Nb(w | 0, z | 0, 21) | 0;
 A = x;
 D = Qb(Q | 0, R | 0, v | 0, D | 0) | 0;
 Ka = Qb(D | 0, x | 0, Ja | 0, Ka | 0) | 0;
 J = Qb(Ka | 0, x | 0, K | 0, J | 0) | 0;
 ma = Qb(J | 0, x | 0, ra | 0, ma | 0) | 0;
 oa = Qb(ma | 0, x | 0, na | 0, oa | 0) | 0;
 p = Qb(oa | 0, x | 0, $ | 0, p | 0) | 0;
 P = Rb(p | 0, x | 0, O & -2097152 | 0, P | 0) | 0;
 A = Qb(P | 0, x | 0, f | 0, A | 0) | 0;
 f = x;
 P = Qb(F | 0, d | 0, 1048576, 0) | 0;
 O = x;
 p = Nb(P | 0, O | 0, 21) | 0;
 $ = x;
 y = Qb(W | 0, V | 0, N | 0, y | 0) | 0;
 i = Qb(y | 0, x | 0, t | 0, i | 0) | 0;
 k = Qb(i | 0, x | 0, o | 0, k | 0) | 0;
 Ma = Qb(k | 0, x | 0, La | 0, Ma | 0) | 0;
 ga = Rb(Ma | 0, x | 0, fa & -2097152 | 0, ga | 0) | 0;
 $ = Qb(ga | 0, x | 0, p | 0, $ | 0) | 0;
 p = x;
 O = Rb(F | 0, d | 0, P & -2097152 | 0, O | 0) | 0;
 P = x;
 d = Qb(u | 0, h | 0, 1048576, 0) | 0;
 F = x;
 ga = Nb(d | 0, F | 0, 21) | 0;
 fa = x;
 Oa = Qb(Z | 0, I | 0, C | 0, Oa | 0) | 0;
 E = Qb(Oa | 0, x | 0, _ | 0, E | 0) | 0;
 j = Rb(E | 0, x | 0, g & -2097152 | 0, j | 0) | 0;
 fa = Qb(j | 0, x | 0, ga | 0, fa | 0) | 0;
 ga = x;
 F = Rb(u | 0, h | 0, d & -2097152 | 0, F | 0) | 0;
 d = x;
 h = Qb(m | 0, r | 0, 1048576, 0) | 0;
 u = x;
 j = Nb(h | 0, u | 0, 21) | 0;
 Na = Qb(j | 0, x | 0, ca | 0, Na | 0) | 0;
 ca = x;
 u = Rb(m | 0, r | 0, h & -2097152 | 0, u | 0) | 0;
 h = x;
 r = Qb(l | 0, q | 0, 1048576, 0) | 0;
 m = x;
 j = Nb(r | 0, m | 0, 21) | 0;
 g = x;
 E = Qb(B | 0, S | 0, 1048576, 0) | 0;
 _ = x;
 Oa = Nb(E | 0, _ | 0, 21) | 0;
 C = x;
 I = Qb(A | 0, f | 0, 1048576, 0) | 0;
 Z = x;
 Ma = Nb(I | 0, Z | 0, 21) | 0;
 P = Qb(Ma | 0, x | 0, O | 0, P | 0) | 0;
 O = x;
 Z = Rb(A | 0, f | 0, I & -2097152 | 0, Z | 0) | 0;
 I = x;
 f = Qb($ | 0, p | 0, 1048576, 0) | 0;
 A = x;
 Ma = Nb(f | 0, A | 0, 21) | 0;
 d = Qb(Ma | 0, x | 0, F | 0, d | 0) | 0;
 F = x;
 A = Rb($ | 0, p | 0, f & -2097152 | 0, A | 0) | 0;
 f = x;
 p = Qb(fa | 0, ga | 0, 1048576, 0) | 0;
 $ = x;
 Ma = Nb(p | 0, $ | 0, 21) | 0;
 h = Qb(Ma | 0, x | 0, u | 0, h | 0) | 0;
 u = x;
 $ = Rb(fa | 0, ga | 0, p & -2097152 | 0, $ | 0) | 0;
 p = x;
 ga = Mb(Na | 0, ca | 0, 666643, 0) | 0;
 fa = x;
 Ma = Mb(Na | 0, ca | 0, 470296, 0) | 0;
 La = x;
 k = Mb(Na | 0, ca | 0, 654183, 0) | 0;
 o = x;
 i = Mb(Na | 0, ca | 0, -997805, -1) | 0;
 t = x;
 y = Mb(Na | 0, ca | 0, 136657, 0) | 0;
 N = x;
 ca = Mb(Na | 0, ca | 0, -683901, -1) | 0;
 ca = Qb(Oa | 0, C | 0, ca | 0, x | 0) | 0;
 ua = Qb(ca | 0, x | 0, ta | 0, ua | 0) | 0;
 z = Rb(ua | 0, x | 0, w & -2097152 | 0, z | 0) | 0;
 w = x;
 ua = Mb(h | 0, u | 0, 666643, 0) | 0;
 ta = x;
 ca = Mb(h | 0, u | 0, 470296, 0) | 0;
 C = x;
 Oa = Mb(h | 0, u | 0, 654183, 0) | 0;
 Na = x;
 V = Mb(h | 0, u | 0, -997805, -1) | 0;
 W = x;
 oa = Mb(h | 0, u | 0, 136657, 0) | 0;
 na = x;
 u = Mb(h | 0, u | 0, -683901, -1) | 0;
 h = x;
 ma = Mb($ | 0, p | 0, 666643, 0) | 0;
 ma = Qb(sa | 0, la | 0, ma | 0, x | 0) | 0;
 la = x;
 sa = Mb($ | 0, p | 0, 470296, 0) | 0;
 ra = x;
 J = Mb($ | 0, p | 0, 654183, 0) | 0;
 K = x;
 Ka = Mb($ | 0, p | 0, -997805, -1) | 0;
 Ja = x;
 D = Mb($ | 0, p | 0, 136657, 0) | 0;
 v = x;
 p = Mb($ | 0, p | 0, -683901, -1) | 0;
 $ = x;
 t = Qb(oa | 0, na | 0, i | 0, t | 0) | 0;
 $ = Qb(t | 0, x | 0, p | 0, $ | 0) | 0;
 g = Qb($ | 0, x | 0, j | 0, g | 0) | 0;
 ja = Qb(g | 0, x | 0, ka | 0, ja | 0) | 0;
 H = Rb(ja | 0, x | 0, G & -2097152 | 0, H | 0) | 0;
 G = x;
 ja = Mb(d | 0, F | 0, 666643, 0) | 0;
 ka = x;
 g = Mb(d | 0, F | 0, 470296, 0) | 0;
 j = x;
 $ = Mb(d | 0, F | 0, 654183, 0) | 0;
 p = x;
 t = Mb(d | 0, F | 0, -997805, -1) | 0;
 i = x;
 na = Mb(d | 0, F | 0, 136657, 0) | 0;
 oa = x;
 F = Mb(d | 0, F | 0, -683901, -1) | 0;
 d = x;
 R = Mb(A | 0, f | 0, 666643, 0) | 0;
 Q = x;
 X = Mb(A | 0, f | 0, 470296, 0) | 0;
 Y = x;
 e = Mb(A | 0, f | 0, 654183, 0) | 0;
 c = x;
 L = Mb(A | 0, f | 0, -997805, -1) | 0;
 M = x;
 n = Mb(A | 0, f | 0, 136657, 0) | 0;
 s = x;
 f = Mb(A | 0, f | 0, -683901, -1) | 0;
 A = x;
 La = Qb(Oa | 0, Na | 0, Ma | 0, La | 0) | 0;
 Ja = Qb(La | 0, x | 0, Ka | 0, Ja | 0) | 0;
 Ha = Qb(Ja | 0, x | 0, Ia | 0, Ha | 0) | 0;
 aa = Rb(Ha | 0, x | 0, ba & -2097152 | 0, aa | 0) | 0;
 oa = Qb(aa | 0, x | 0, na | 0, oa | 0) | 0;
 A = Qb(oa | 0, x | 0, f | 0, A | 0) | 0;
 f = x;
 oa = Mb(P | 0, O | 0, 666643, 0) | 0;
 T = Qb(oa | 0, x | 0, U | 0, T | 0) | 0;
 U = x;
 oa = Mb(P | 0, O | 0, 470296, 0) | 0;
 na = x;
 aa = Mb(P | 0, O | 0, 654183, 0) | 0;
 ba = x;
 Da = Qb(Ga | 0, Fa | 0, Ea | 0, Da | 0) | 0;
 Ba = Rb(Da | 0, x | 0, Ca & -2097152 | 0, Ba | 0) | 0;
 ba = Qb(Ba | 0, x | 0, aa | 0, ba | 0) | 0;
 ka = Qb(ba | 0, x | 0, ja | 0, ka | 0) | 0;
 Y = Qb(ka | 0, x | 0, X | 0, Y | 0) | 0;
 X = x;
 ka = Mb(P | 0, O | 0, -997805, -1) | 0;
 ja = x;
 ba = Mb(P | 0, O | 0, 136657, 0) | 0;
 aa = x;
 xa = Qb(Aa | 0, za | 0, ya | 0, xa | 0) | 0;
 va = Rb(xa | 0, x | 0, wa & -2097152 | 0, va | 0) | 0;
 ta = Qb(va | 0, x | 0, ua | 0, ta | 0) | 0;
 ra = Qb(ta | 0, x | 0, sa | 0, ra | 0) | 0;
 aa = Qb(ra | 0, x | 0, ba | 0, aa | 0) | 0;
 p = Qb(aa | 0, x | 0, $ | 0, p | 0) | 0;
 M = Qb(p | 0, x | 0, L | 0, M | 0) | 0;
 L = x;
 O = Mb(P | 0, O | 0, -683901, -1) | 0;
 P = x;
 p = Qb(T | 0, U | 0, 1048576, 0) | 0;
 $ = x;
 aa = Nb(p | 0, $ | 0, 21) | 0;
 ba = x;
 na = Qb(qa | 0, pa | 0, oa | 0, na | 0) | 0;
 Q = Qb(na | 0, x | 0, R | 0, Q | 0) | 0;
 ba = Qb(Q | 0, x | 0, aa | 0, ba | 0) | 0;
 aa = x;
 $ = Rb(T | 0, U | 0, p & -2097152 | 0, $ | 0) | 0;
 p = x;
 U = Qb(Y | 0, X | 0, 1048576, 0) | 0;
 T = x;
 Q = Nb(U | 0, T | 0, 21) | 0;
 R = x;
 ja = Qb(ma | 0, la | 0, ka | 0, ja | 0) | 0;
 j = Qb(ja | 0, x | 0, g | 0, j | 0) | 0;
 c = Qb(j | 0, x | 0, e | 0, c | 0) | 0;
 R = Qb(c | 0, x | 0, Q | 0, R | 0) | 0;
 Q = x;
 c = Qb(M | 0, L | 0, 1048576, 0) | 0;
 e = x;
 j = Nb(c | 0, e | 0, 21) | 0;
 g = x;
 fa = Qb(ia | 0, ha | 0, ga | 0, fa | 0) | 0;
 da = Rb(fa | 0, x | 0, ea & -2097152 | 0, da | 0) | 0;
 C = Qb(da | 0, x | 0, ca | 0, C | 0) | 0;
 K = Qb(C | 0, x | 0, J | 0, K | 0) | 0;
 P = Qb(K | 0, x | 0, O | 0, P | 0) | 0;
 i = Qb(P | 0, x | 0, t | 0, i | 0) | 0;
 s = Qb(i | 0, x | 0, n | 0, s | 0) | 0;
 g = Qb(s | 0, x | 0, j | 0, g | 0) | 0;
 j = x;
 s = Qb(A | 0, f | 0, 1048576, 0) | 0;
 n = x;
 i = Nb(s | 0, n | 0, 21) | 0;
 t = x;
 o = Qb(V | 0, W | 0, k | 0, o | 0) | 0;
 v = Qb(o | 0, x | 0, D | 0, v | 0) | 0;
 q = Qb(v | 0, x | 0, l | 0, q | 0) | 0;
 m = Rb(q | 0, x | 0, r & -2097152 | 0, m | 0) | 0;
 d = Qb(m | 0, x | 0, F | 0, d | 0) | 0;
 t = Qb(d | 0, x | 0, i | 0, t | 0) | 0;
 i = x;
 n = Rb(A | 0, f | 0, s & -2097152 | 0, n | 0) | 0;
 s = x;
 f = Qb(H | 0, G | 0, 1048576, 0) | 0;
 A = x;
 d = Nb(f | 0, A | 0, 21) | 0;
 F = x;
 N = Qb(u | 0, h | 0, y | 0, N | 0) | 0;
 S = Qb(N | 0, x | 0, B | 0, S | 0) | 0;
 _ = Rb(S | 0, x | 0, E & -2097152 | 0, _ | 0) | 0;
 F = Qb(_ | 0, x | 0, d | 0, F | 0) | 0;
 d = x;
 A = Rb(H | 0, G | 0, f & -2097152 | 0, A | 0) | 0;
 f = x;
 G = Qb(z | 0, w | 0, 1048576, 0) | 0;
 H = x;
 _ = Nb(G | 0, H | 0, 21) | 0;
 _ = Qb(Z | 0, I | 0, _ | 0, x | 0) | 0;
 I = x;
 Z = Qb(ba | 0, aa | 0, 1048576, 0) | 0;
 E = x;
 S = Nb(Z | 0, E | 0, 21) | 0;
 B = x;
 N = Qb(R | 0, Q | 0, 1048576, 0) | 0;
 y = x;
 h = Nb(N | 0, y | 0, 21) | 0;
 u = x;
 m = Qb(g | 0, j | 0, 1048576, 0) | 0;
 r = x;
 q = Nb(m | 0, r | 0, 21) | 0;
 q = Qb(n | 0, s | 0, q | 0, x | 0) | 0;
 s = x;
 n = Qb(t | 0, i | 0, 1048576, 0) | 0;
 l = x;
 v = Nb(n | 0, l | 0, 21) | 0;
 v = Qb(A | 0, f | 0, v | 0, x | 0) | 0;
 f = x;
 l = Rb(t | 0, i | 0, n & -2097152 | 0, l | 0) | 0;
 n = x;
 i = Qb(F | 0, d | 0, 1048576, 0) | 0;
 t = x;
 A = Nb(i | 0, t | 0, 21) | 0;
 D = x;
 t = Rb(F | 0, d | 0, i & -2097152 | 0, t | 0) | 0;
 i = x;
 d = Qb(_ | 0, I | 0, 1048576, 0) | 0;
 F = x;
 o = Nb(d | 0, F | 0, 21) | 0;
 k = x;
 F = Rb(_ | 0, I | 0, d & -2097152 | 0, F | 0) | 0;
 d = x;
 I = Mb(o | 0, k | 0, 666643, 0) | 0;
 I = Qb($ | 0, p | 0, I | 0, x | 0) | 0;
 p = x;
 $ = Mb(o | 0, k | 0, 470296, 0) | 0;
 _ = x;
 W = Mb(o | 0, k | 0, 654183, 0) | 0;
 V = x;
 P = Mb(o | 0, k | 0, -997805, -1) | 0;
 O = x;
 K = Mb(o | 0, k | 0, 136657, 0) | 0;
 J = x;
 k = Mb(o | 0, k | 0, -683901, -1) | 0;
 o = x;
 p = Nb(I | 0, p | 0, 21) | 0;
 C = x;
 _ = Qb(ba | 0, aa | 0, $ | 0, _ | 0) | 0;
 E = Rb(_ | 0, x | 0, Z & -2097152 | 0, E | 0) | 0;
 C = Qb(E | 0, x | 0, p | 0, C | 0) | 0;
 p = Nb(C | 0, x | 0, 21) | 0;
 E = x;
 V = Qb(Y | 0, X | 0, W | 0, V | 0) | 0;
 T = Rb(V | 0, x | 0, U & -2097152 | 0, T | 0) | 0;
 B = Qb(T | 0, x | 0, S | 0, B | 0) | 0;
 E = Qb(B | 0, x | 0, p | 0, E | 0) | 0;
 p = Nb(E | 0, x | 0, 21) | 0;
 B = x;
 O = Qb(R | 0, Q | 0, P | 0, O | 0) | 0;
 y = Rb(O | 0, x | 0, N & -2097152 | 0, y | 0) | 0;
 B = Qb(y | 0, x | 0, p | 0, B | 0) | 0;
 p = Nb(B | 0, x | 0, 21) | 0;
 y = x;
 J = Qb(M | 0, L | 0, K | 0, J | 0) | 0;
 e = Rb(J | 0, x | 0, c & -2097152 | 0, e | 0) | 0;
 u = Qb(e | 0, x | 0, h | 0, u | 0) | 0;
 y = Qb(u | 0, x | 0, p | 0, y | 0) | 0;
 p = Nb(y | 0, x | 0, 21) | 0;
 u = x;
 o = Qb(g | 0, j | 0, k | 0, o | 0) | 0;
 r = Rb(o | 0, x | 0, m & -2097152 | 0, r | 0) | 0;
 u = Qb(r | 0, x | 0, p | 0, u | 0) | 0;
 p = Nb(u | 0, x | 0, 21) | 0;
 p = Qb(q | 0, s | 0, p | 0, x | 0) | 0;
 s = Nb(p | 0, x | 0, 21) | 0;
 n = Qb(s | 0, x | 0, l | 0, n | 0) | 0;
 l = Nb(n | 0, x | 0, 21) | 0;
 l = Qb(v | 0, f | 0, l | 0, x | 0) | 0;
 f = Nb(l | 0, x | 0, 21) | 0;
 i = Qb(f | 0, x | 0, t | 0, i | 0) | 0;
 t = Nb(i | 0, x | 0, 21) | 0;
 f = x;
 D = Qb(z | 0, w | 0, A | 0, D | 0) | 0;
 H = Rb(D | 0, x | 0, G & -2097152 | 0, H | 0) | 0;
 f = Qb(H | 0, x | 0, t | 0, f | 0) | 0;
 t = Nb(f | 0, x | 0, 21) | 0;
 d = Qb(t | 0, x | 0, F | 0, d | 0) | 0;
 F = Nb(d | 0, x | 0, 21) | 0;
 t = x;
 H = Mb(F | 0, t | 0, 666643, 0) | 0;
 I = Qb(H | 0, x | 0, I & 2097151 | 0, 0) | 0;
 H = x;
 G = Mb(F | 0, t | 0, 470296, 0) | 0;
 C = Qb(G | 0, x | 0, C & 2097151 | 0, 0) | 0;
 G = x;
 D = Mb(F | 0, t | 0, 654183, 0) | 0;
 E = Qb(D | 0, x | 0, E & 2097151 | 0, 0) | 0;
 D = x;
 A = Mb(F | 0, t | 0, -997805, -1) | 0;
 B = Qb(A | 0, x | 0, B & 2097151 | 0, 0) | 0;
 A = x;
 w = Mb(F | 0, t | 0, 136657, 0) | 0;
 y = Qb(w | 0, x | 0, y & 2097151 | 0, 0) | 0;
 w = x;
 t = Mb(F | 0, t | 0, -683901, -1) | 0;
 u = Qb(t | 0, x | 0, u & 2097151 | 0, 0) | 0;
 t = x;
 F = Nb(I | 0, H | 0, 21) | 0;
 F = Qb(C | 0, G | 0, F | 0, x | 0) | 0;
 G = x;
 C = Nb(F | 0, G | 0, 21) | 0;
 C = Qb(E | 0, D | 0, C | 0, x | 0) | 0;
 D = x;
 E = F & 2097151;
 z = Nb(C | 0, D | 0, 21) | 0;
 z = Qb(B | 0, A | 0, z | 0, x | 0) | 0;
 A = x;
 B = C & 2097151;
 v = Nb(z | 0, A | 0, 21) | 0;
 v = Qb(y | 0, w | 0, v | 0, x | 0) | 0;
 w = x;
 y = z & 2097151;
 s = Nb(v | 0, w | 0, 21) | 0;
 s = Qb(u | 0, t | 0, s | 0, x | 0) | 0;
 t = x;
 u = v & 2097151;
 q = Nb(s | 0, t | 0, 21) | 0;
 p = Qb(q | 0, x | 0, p & 2097151 | 0, 0) | 0;
 q = x;
 r = s & 2097151;
 m = Nb(p | 0, q | 0, 21) | 0;
 n = Qb(m | 0, x | 0, n & 2097151 | 0, 0) | 0;
 m = x;
 o = p & 2097151;
 k = Nb(n | 0, m | 0, 21) | 0;
 l = Qb(k | 0, x | 0, l & 2097151 | 0, 0) | 0;
 k = x;
 j = Nb(l | 0, k | 0, 21) | 0;
 i = Qb(j | 0, x | 0, i & 2097151 | 0, 0) | 0;
 j = x;
 g = Nb(i | 0, j | 0, 21) | 0;
 f = Qb(g | 0, x | 0, f & 2097151 | 0, 0) | 0;
 g = x;
 h = i & 2097151;
 e = Nb(f | 0, g | 0, 21) | 0;
 d = Qb(e | 0, x | 0, d & 2097151 | 0, 0) | 0;
 e = x;
 c = f & 2097151;
 a[b >> 0] = I;
 J = Ob(I | 0, H | 0, 8) | 0;
 a[b + 1 >> 0] = J;
 H = Ob(I | 0, H | 0, 16) | 0;
 I = Pb(E | 0, 0, 5) | 0;
 a[b + 2 >> 0] = I | H & 31;
 H = Ob(F | 0, G | 0, 3) | 0;
 a[b + 3 >> 0] = H;
 G = Ob(F | 0, G | 0, 11) | 0;
 a[b + 4 >> 0] = G;
 E = Ob(E | 0, 0, 19) | 0;
 G = x;
 F = Pb(B | 0, 0, 2) | 0;
 a[b + 5 >> 0] = F | E;
 D = Ob(C | 0, D | 0, 6) | 0;
 a[b + 6 >> 0] = D;
 B = Ob(B | 0, 0, 14) | 0;
 D = x;
 C = Pb(y | 0, 0, 7) | 0;
 a[b + 7 >> 0] = C | B;
 B = Ob(z | 0, A | 0, 1) | 0;
 a[b + 8 >> 0] = B;
 A = Ob(z | 0, A | 0, 9) | 0;
 a[b + 9 >> 0] = A;
 y = Ob(y | 0, 0, 17) | 0;
 A = x;
 z = Pb(u | 0, 0, 4) | 0;
 a[b + 10 >> 0] = z | y;
 y = Ob(v | 0, w | 0, 4) | 0;
 a[b + 11 >> 0] = y;
 w = Ob(v | 0, w | 0, 12) | 0;
 a[b + 12 >> 0] = w;
 u = Ob(u | 0, 0, 20) | 0;
 w = x;
 v = Pb(r | 0, 0, 1) | 0;
 a[b + 13 >> 0] = v | u;
 t = Ob(s | 0, t | 0, 7) | 0;
 a[b + 14 >> 0] = t;
 r = Ob(r | 0, 0, 15) | 0;
 t = x;
 s = Pb(o | 0, 0, 6) | 0;
 a[b + 15 >> 0] = s | r;
 r = Ob(p | 0, q | 0, 2) | 0;
 a[b + 16 >> 0] = r;
 q = Ob(p | 0, q | 0, 10) | 0;
 a[b + 17 >> 0] = q;
 o = Ob(o | 0, 0, 18) | 0;
 q = x;
 p = Pb(n | 0, m | 0, 3) | 0;
 a[b + 18 >> 0] = p | o;
 o = Ob(n | 0, m | 0, 5) | 0;
 a[b + 19 >> 0] = o;
 m = Ob(n | 0, m | 0, 13) | 0;
 a[b + 20 >> 0] = m;
 a[b + 21 >> 0] = l;
 m = Ob(l | 0, k | 0, 8) | 0;
 a[b + 22 >> 0] = m;
 k = Ob(l | 0, k | 0, 16) | 0;
 l = Pb(h | 0, 0, 5) | 0;
 a[b + 23 >> 0] = l | k & 31;
 k = Ob(i | 0, j | 0, 3) | 0;
 a[b + 24 >> 0] = k;
 j = Ob(i | 0, j | 0, 11) | 0;
 a[b + 25 >> 0] = j;
 h = Ob(h | 0, 0, 19) | 0;
 j = x;
 i = Pb(c | 0, 0, 2) | 0;
 a[b + 26 >> 0] = i | h;
 g = Ob(f | 0, g | 0, 6) | 0;
 a[b + 27 >> 0] = g;
 c = Ob(c | 0, 0, 14) | 0;
 g = x;
 f = Pb(d | 0, e | 0, 7) | 0;
 a[b + 28 >> 0] = f | c;
 c = Ob(d | 0, e | 0, 1) | 0;
 a[b + 29 >> 0] = c;
 c = Ob(d | 0, e | 0, 9) | 0;
 a[b + 30 >> 0] = c;
 e = Nb(d | 0, e | 0, 17) | 0;
 a[b + 31 >> 0] = e;
 return;
}

function Hb(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0;
 q = k;
 k = k + 16 | 0;
 o = q;
 do if (a >>> 0 < 245) {
  l = a >>> 0 < 11 ? 16 : a + 11 & -8;
  a = l >>> 3;
  n = c[8144] | 0;
  b = n >>> a;
  if (b & 3 | 0) {
   a = (b & 1 ^ 1) + a | 0;
   b = 32616 + (a << 1 << 2) | 0;
   d = b + 8 | 0;
   e = c[d >> 2] | 0;
   f = e + 8 | 0;
   g = c[f >> 2] | 0;
   if ((g | 0) == (b | 0)) c[8144] = n & ~(1 << a); else {
    c[g + 12 >> 2] = b;
    c[d >> 2] = g;
   }
   p = a << 3;
   c[e + 4 >> 2] = p | 3;
   p = e + p + 4 | 0;
   c[p >> 2] = c[p >> 2] | 1;
   p = f;
   k = q;
   return p | 0;
  }
  m = c[8146] | 0;
  if (l >>> 0 > m >>> 0) {
   if (b | 0) {
    i = 2 << a;
    a = b << a & (i | 0 - i);
    a = (a & 0 - a) + -1 | 0;
    i = a >>> 12 & 16;
    a = a >>> i;
    d = a >>> 5 & 8;
    a = a >>> d;
    g = a >>> 2 & 4;
    a = a >>> g;
    b = a >>> 1 & 2;
    a = a >>> b;
    e = a >>> 1 & 1;
    e = (d | i | g | b | e) + (a >>> e) | 0;
    a = 32616 + (e << 1 << 2) | 0;
    b = a + 8 | 0;
    g = c[b >> 2] | 0;
    i = g + 8 | 0;
    d = c[i >> 2] | 0;
    if ((d | 0) == (a | 0)) {
     b = n & ~(1 << e);
     c[8144] = b;
    } else {
     c[d + 12 >> 2] = a;
     c[b >> 2] = d;
     b = n;
    }
    p = e << 3;
    h = p - l | 0;
    c[g + 4 >> 2] = l | 3;
    f = g + l | 0;
    c[f + 4 >> 2] = h | 1;
    c[g + p >> 2] = h;
    if (m | 0) {
     e = c[8149] | 0;
     a = m >>> 3;
     d = 32616 + (a << 1 << 2) | 0;
     a = 1 << a;
     if (!(b & a)) {
      c[8144] = b | a;
      a = d;
      b = d + 8 | 0;
     } else {
      b = d + 8 | 0;
      a = c[b >> 2] | 0;
     }
     c[b >> 2] = e;
     c[a + 12 >> 2] = e;
     c[e + 8 >> 2] = a;
     c[e + 12 >> 2] = d;
    }
    c[8146] = h;
    c[8149] = f;
    p = i;
    k = q;
    return p | 0;
   }
   g = c[8145] | 0;
   if (g) {
    b = (g & 0 - g) + -1 | 0;
    f = b >>> 12 & 16;
    b = b >>> f;
    e = b >>> 5 & 8;
    b = b >>> e;
    h = b >>> 2 & 4;
    b = b >>> h;
    i = b >>> 1 & 2;
    b = b >>> i;
    j = b >>> 1 & 1;
    j = c[32880 + ((e | f | h | i | j) + (b >>> j) << 2) >> 2] | 0;
    b = j;
    i = j;
    j = (c[j + 4 >> 2] & -8) - l | 0;
    while (1) {
     a = c[b + 16 >> 2] | 0;
     if (!a) {
      a = c[b + 20 >> 2] | 0;
      if (!a) break;
     }
     h = (c[a + 4 >> 2] & -8) - l | 0;
     f = h >>> 0 < j >>> 0;
     b = a;
     i = f ? a : i;
     j = f ? h : j;
    }
    h = i + l | 0;
    if (h >>> 0 > i >>> 0) {
     f = c[i + 24 >> 2] | 0;
     a = c[i + 12 >> 2] | 0;
     do if ((a | 0) == (i | 0)) {
      b = i + 20 | 0;
      a = c[b >> 2] | 0;
      if (!a) {
       b = i + 16 | 0;
       a = c[b >> 2] | 0;
       if (!a) {
        d = 0;
        break;
       }
      }
      while (1) {
       e = a + 20 | 0;
       d = c[e >> 2] | 0;
       if (!d) {
        e = a + 16 | 0;
        d = c[e >> 2] | 0;
        if (!d) break; else {
         a = d;
         b = e;
        }
       } else {
        a = d;
        b = e;
       }
      }
      c[b >> 2] = 0;
      d = a;
     } else {
      d = c[i + 8 >> 2] | 0;
      c[d + 12 >> 2] = a;
      c[a + 8 >> 2] = d;
      d = a;
     } while (0);
     do if (f | 0) {
      a = c[i + 28 >> 2] | 0;
      b = 32880 + (a << 2) | 0;
      if ((i | 0) == (c[b >> 2] | 0)) {
       c[b >> 2] = d;
       if (!d) {
        c[8145] = g & ~(1 << a);
        break;
       }
      } else {
       p = f + 16 | 0;
       c[((c[p >> 2] | 0) == (i | 0) ? p : f + 20 | 0) >> 2] = d;
       if (!d) break;
      }
      c[d + 24 >> 2] = f;
      a = c[i + 16 >> 2] | 0;
      if (a | 0) {
       c[d + 16 >> 2] = a;
       c[a + 24 >> 2] = d;
      }
      a = c[i + 20 >> 2] | 0;
      if (a | 0) {
       c[d + 20 >> 2] = a;
       c[a + 24 >> 2] = d;
      }
     } while (0);
     if (j >>> 0 < 16) {
      p = j + l | 0;
      c[i + 4 >> 2] = p | 3;
      p = i + p + 4 | 0;
      c[p >> 2] = c[p >> 2] | 1;
     } else {
      c[i + 4 >> 2] = l | 3;
      c[h + 4 >> 2] = j | 1;
      c[h + j >> 2] = j;
      if (m | 0) {
       e = c[8149] | 0;
       a = m >>> 3;
       d = 32616 + (a << 1 << 2) | 0;
       a = 1 << a;
       if (!(a & n)) {
        c[8144] = a | n;
        a = d;
        b = d + 8 | 0;
       } else {
        b = d + 8 | 0;
        a = c[b >> 2] | 0;
       }
       c[b >> 2] = e;
       c[a + 12 >> 2] = e;
       c[e + 8 >> 2] = a;
       c[e + 12 >> 2] = d;
      }
      c[8146] = j;
      c[8149] = h;
     }
     p = i + 8 | 0;
     k = q;
     return p | 0;
    }
   }
  }
 } else if (a >>> 0 > 4294967231) l = -1; else {
  a = a + 11 | 0;
  l = a & -8;
  j = c[8145] | 0;
  if (j) {
   d = 0 - l | 0;
   a = a >>> 8;
   if (!a) h = 0; else if (l >>> 0 > 16777215) h = 31; else {
    n = (a + 1048320 | 0) >>> 16 & 8;
    p = a << n;
    m = (p + 520192 | 0) >>> 16 & 4;
    p = p << m;
    h = (p + 245760 | 0) >>> 16 & 2;
    h = 14 - (m | n | h) + (p << h >>> 15) | 0;
    h = l >>> (h + 7 | 0) & 1 | h << 1;
   }
   b = c[32880 + (h << 2) >> 2] | 0;
   a : do if (!b) {
    b = 0;
    a = 0;
    p = 61;
   } else {
    a = 0;
    g = l << ((h | 0) == 31 ? 0 : 25 - (h >>> 1) | 0);
    e = 0;
    while (1) {
     f = (c[b + 4 >> 2] & -8) - l | 0;
     if (f >>> 0 < d >>> 0) if (!f) {
      a = b;
      d = 0;
      p = 65;
      break a;
     } else {
      a = b;
      d = f;
     }
     p = c[b + 20 >> 2] | 0;
     b = c[b + 16 + (g >>> 31 << 2) >> 2] | 0;
     e = (p | 0) == 0 | (p | 0) == (b | 0) ? e : p;
     if (!b) {
      b = e;
      p = 61;
      break;
     } else g = g << 1;
    }
   } while (0);
   if ((p | 0) == 61) {
    if ((b | 0) == 0 & (a | 0) == 0) {
     a = 2 << h;
     a = (a | 0 - a) & j;
     if (!a) break;
     n = (a & 0 - a) + -1 | 0;
     h = n >>> 12 & 16;
     n = n >>> h;
     g = n >>> 5 & 8;
     n = n >>> g;
     i = n >>> 2 & 4;
     n = n >>> i;
     m = n >>> 1 & 2;
     n = n >>> m;
     b = n >>> 1 & 1;
     a = 0;
     b = c[32880 + ((g | h | i | m | b) + (n >>> b) << 2) >> 2] | 0;
    }
    if (!b) {
     i = a;
     g = d;
    } else p = 65;
   }
   if ((p | 0) == 65) {
    e = b;
    while (1) {
     n = (c[e + 4 >> 2] & -8) - l | 0;
     b = n >>> 0 < d >>> 0;
     d = b ? n : d;
     a = b ? e : a;
     b = c[e + 16 >> 2] | 0;
     if (!b) b = c[e + 20 >> 2] | 0;
     if (!b) {
      i = a;
      g = d;
      break;
     } else e = b;
    }
   }
   if (i) if (g >>> 0 < ((c[8146] | 0) - l | 0) >>> 0) {
    h = i + l | 0;
    if (h >>> 0 > i >>> 0) {
     f = c[i + 24 >> 2] | 0;
     a = c[i + 12 >> 2] | 0;
     do if ((a | 0) == (i | 0)) {
      b = i + 20 | 0;
      a = c[b >> 2] | 0;
      if (!a) {
       b = i + 16 | 0;
       a = c[b >> 2] | 0;
       if (!a) {
        a = 0;
        break;
       }
      }
      while (1) {
       e = a + 20 | 0;
       d = c[e >> 2] | 0;
       if (!d) {
        e = a + 16 | 0;
        d = c[e >> 2] | 0;
        if (!d) break; else {
         a = d;
         b = e;
        }
       } else {
        a = d;
        b = e;
       }
      }
      c[b >> 2] = 0;
     } else {
      p = c[i + 8 >> 2] | 0;
      c[p + 12 >> 2] = a;
      c[a + 8 >> 2] = p;
     } while (0);
     do if (!f) e = j; else {
      b = c[i + 28 >> 2] | 0;
      d = 32880 + (b << 2) | 0;
      if ((i | 0) == (c[d >> 2] | 0)) {
       c[d >> 2] = a;
       if (!a) {
        e = j & ~(1 << b);
        c[8145] = e;
        break;
       }
      } else {
       p = f + 16 | 0;
       c[((c[p >> 2] | 0) == (i | 0) ? p : f + 20 | 0) >> 2] = a;
       if (!a) {
        e = j;
        break;
       }
      }
      c[a + 24 >> 2] = f;
      b = c[i + 16 >> 2] | 0;
      if (b | 0) {
       c[a + 16 >> 2] = b;
       c[b + 24 >> 2] = a;
      }
      b = c[i + 20 >> 2] | 0;
      if (!b) e = j; else {
       c[a + 20 >> 2] = b;
       c[b + 24 >> 2] = a;
       e = j;
      }
     } while (0);
     b : do if (g >>> 0 < 16) {
      p = g + l | 0;
      c[i + 4 >> 2] = p | 3;
      p = i + p + 4 | 0;
      c[p >> 2] = c[p >> 2] | 1;
     } else {
      c[i + 4 >> 2] = l | 3;
      c[h + 4 >> 2] = g | 1;
      c[h + g >> 2] = g;
      a = g >>> 3;
      if (g >>> 0 < 256) {
       d = 32616 + (a << 1 << 2) | 0;
       b = c[8144] | 0;
       a = 1 << a;
       if (!(b & a)) {
        c[8144] = b | a;
        a = d;
        b = d + 8 | 0;
       } else {
        b = d + 8 | 0;
        a = c[b >> 2] | 0;
       }
       c[b >> 2] = h;
       c[a + 12 >> 2] = h;
       c[h + 8 >> 2] = a;
       c[h + 12 >> 2] = d;
       break;
      }
      a = g >>> 8;
      if (!a) d = 0; else if (g >>> 0 > 16777215) d = 31; else {
       o = (a + 1048320 | 0) >>> 16 & 8;
       p = a << o;
       n = (p + 520192 | 0) >>> 16 & 4;
       p = p << n;
       d = (p + 245760 | 0) >>> 16 & 2;
       d = 14 - (n | o | d) + (p << d >>> 15) | 0;
       d = g >>> (d + 7 | 0) & 1 | d << 1;
      }
      a = 32880 + (d << 2) | 0;
      c[h + 28 >> 2] = d;
      b = h + 16 | 0;
      c[b + 4 >> 2] = 0;
      c[b >> 2] = 0;
      b = 1 << d;
      if (!(e & b)) {
       c[8145] = e | b;
       c[a >> 2] = h;
       c[h + 24 >> 2] = a;
       c[h + 12 >> 2] = h;
       c[h + 8 >> 2] = h;
       break;
      }
      a = c[a >> 2] | 0;
      c : do if ((c[a + 4 >> 2] & -8 | 0) != (g | 0)) {
       e = g << ((d | 0) == 31 ? 0 : 25 - (d >>> 1) | 0);
       while (1) {
        d = a + 16 + (e >>> 31 << 2) | 0;
        b = c[d >> 2] | 0;
        if (!b) break;
        if ((c[b + 4 >> 2] & -8 | 0) == (g | 0)) {
         a = b;
         break c;
        } else {
         e = e << 1;
         a = b;
        }
       }
       c[d >> 2] = h;
       c[h + 24 >> 2] = a;
       c[h + 12 >> 2] = h;
       c[h + 8 >> 2] = h;
       break b;
      } while (0);
      o = a + 8 | 0;
      p = c[o >> 2] | 0;
      c[p + 12 >> 2] = h;
      c[o >> 2] = h;
      c[h + 8 >> 2] = p;
      c[h + 12 >> 2] = a;
      c[h + 24 >> 2] = 0;
     } while (0);
     p = i + 8 | 0;
     k = q;
     return p | 0;
    }
   }
  }
 } while (0);
 d = c[8146] | 0;
 if (d >>> 0 >= l >>> 0) {
  a = d - l | 0;
  b = c[8149] | 0;
  if (a >>> 0 > 15) {
   p = b + l | 0;
   c[8149] = p;
   c[8146] = a;
   c[p + 4 >> 2] = a | 1;
   c[b + d >> 2] = a;
   c[b + 4 >> 2] = l | 3;
  } else {
   c[8146] = 0;
   c[8149] = 0;
   c[b + 4 >> 2] = d | 3;
   p = b + d + 4 | 0;
   c[p >> 2] = c[p >> 2] | 1;
  }
  p = b + 8 | 0;
  k = q;
  return p | 0;
 }
 g = c[8147] | 0;
 if (g >>> 0 > l >>> 0) {
  n = g - l | 0;
  c[8147] = n;
  p = c[8150] | 0;
  o = p + l | 0;
  c[8150] = o;
  c[o + 4 >> 2] = n | 1;
  c[p + 4 >> 2] = l | 3;
  p = p + 8 | 0;
  k = q;
  return p | 0;
 }
 if (!(c[8262] | 0)) {
  c[8264] = 4096;
  c[8263] = 4096;
  c[8265] = -1;
  c[8266] = -1;
  c[8267] = 0;
  c[8255] = 0;
  c[8262] = o & -16 ^ 1431655768;
  a = 4096;
 } else a = c[8264] | 0;
 h = l + 48 | 0;
 i = l + 47 | 0;
 f = a + i | 0;
 e = 0 - a | 0;
 j = f & e;
 if (j >>> 0 <= l >>> 0) {
  p = 0;
  k = q;
  return p | 0;
 }
 a = c[8254] | 0;
 if (a | 0) {
  n = c[8252] | 0;
  o = n + j | 0;
  if (o >>> 0 <= n >>> 0 | o >>> 0 > a >>> 0) {
   p = 0;
   k = q;
   return p | 0;
  }
 }
 d : do if (!(c[8255] & 4)) {
  b = c[8150] | 0;
  e : do if (!b) p = 128; else {
   d = 33024;
   while (1) {
    a = c[d >> 2] | 0;
    if (a >>> 0 <= b >>> 0) if ((a + (c[d + 4 >> 2] | 0) | 0) >>> 0 > b >>> 0) break;
    a = c[d + 8 >> 2] | 0;
    if (!a) {
     p = 128;
     break e;
    } else d = a;
   }
   a = f - g & e;
   if (a >>> 0 < 2147483647) {
    e = Vb(a | 0) | 0;
    if ((e | 0) == ((c[d >> 2] | 0) + (c[d + 4 >> 2] | 0) | 0)) {
     if ((e | 0) != (-1 | 0)) {
      p = 145;
      break d;
     }
    } else p = 136;
   } else a = 0;
  } while (0);
  do if ((p | 0) == 128) {
   e = Vb(0) | 0;
   if ((e | 0) == (-1 | 0)) a = 0; else {
    a = e;
    b = c[8263] | 0;
    d = b + -1 | 0;
    a = ((d & a | 0) == 0 ? 0 : (d + a & 0 - b) - a | 0) + j | 0;
    b = c[8252] | 0;
    d = a + b | 0;
    if (a >>> 0 > l >>> 0 & a >>> 0 < 2147483647) {
     f = c[8254] | 0;
     if (f | 0) if (d >>> 0 <= b >>> 0 | d >>> 0 > f >>> 0) {
      a = 0;
      break;
     }
     b = Vb(a | 0) | 0;
     if ((b | 0) == (e | 0)) {
      p = 145;
      break d;
     } else {
      e = b;
      p = 136;
     }
    } else a = 0;
   }
  } while (0);
  do if ((p | 0) == 136) {
   d = 0 - a | 0;
   if (!(h >>> 0 > a >>> 0 & (a >>> 0 < 2147483647 & (e | 0) != (-1 | 0)))) if ((e | 0) == (-1 | 0)) {
    a = 0;
    break;
   } else {
    p = 145;
    break d;
   }
   b = c[8264] | 0;
   b = i - a + b & 0 - b;
   if (b >>> 0 >= 2147483647) {
    p = 145;
    break d;
   }
   if ((Vb(b | 0) | 0) == (-1 | 0)) {
    Vb(d | 0) | 0;
    a = 0;
    break;
   } else {
    a = b + a | 0;
    p = 145;
    break d;
   }
  } while (0);
  c[8255] = c[8255] | 4;
  p = 143;
 } else {
  a = 0;
  p = 143;
 } while (0);
 if ((p | 0) == 143) if (j >>> 0 < 2147483647) {
  e = Vb(j | 0) | 0;
  o = Vb(0) | 0;
  b = o - e | 0;
  d = b >>> 0 > (l + 40 | 0) >>> 0;
  if (!((e | 0) == (-1 | 0) | d ^ 1 | e >>> 0 < o >>> 0 & ((e | 0) != (-1 | 0) & (o | 0) != (-1 | 0)) ^ 1)) {
   a = d ? b : a;
   p = 145;
  }
 }
 if ((p | 0) == 145) {
  b = (c[8252] | 0) + a | 0;
  c[8252] = b;
  if (b >>> 0 > (c[8253] | 0) >>> 0) c[8253] = b;
  j = c[8150] | 0;
  f : do if (!j) {
   p = c[8148] | 0;
   if ((p | 0) == 0 | e >>> 0 < p >>> 0) c[8148] = e;
   c[8256] = e;
   c[8257] = a;
   c[8259] = 0;
   c[8153] = c[8262];
   c[8152] = -1;
   c[8157] = 32616;
   c[8156] = 32616;
   c[8159] = 32624;
   c[8158] = 32624;
   c[8161] = 32632;
   c[8160] = 32632;
   c[8163] = 32640;
   c[8162] = 32640;
   c[8165] = 32648;
   c[8164] = 32648;
   c[8167] = 32656;
   c[8166] = 32656;
   c[8169] = 32664;
   c[8168] = 32664;
   c[8171] = 32672;
   c[8170] = 32672;
   c[8173] = 32680;
   c[8172] = 32680;
   c[8175] = 32688;
   c[8174] = 32688;
   c[8177] = 32696;
   c[8176] = 32696;
   c[8179] = 32704;
   c[8178] = 32704;
   c[8181] = 32712;
   c[8180] = 32712;
   c[8183] = 32720;
   c[8182] = 32720;
   c[8185] = 32728;
   c[8184] = 32728;
   c[8187] = 32736;
   c[8186] = 32736;
   c[8189] = 32744;
   c[8188] = 32744;
   c[8191] = 32752;
   c[8190] = 32752;
   c[8193] = 32760;
   c[8192] = 32760;
   c[8195] = 32768;
   c[8194] = 32768;
   c[8197] = 32776;
   c[8196] = 32776;
   c[8199] = 32784;
   c[8198] = 32784;
   c[8201] = 32792;
   c[8200] = 32792;
   c[8203] = 32800;
   c[8202] = 32800;
   c[8205] = 32808;
   c[8204] = 32808;
   c[8207] = 32816;
   c[8206] = 32816;
   c[8209] = 32824;
   c[8208] = 32824;
   c[8211] = 32832;
   c[8210] = 32832;
   c[8213] = 32840;
   c[8212] = 32840;
   c[8215] = 32848;
   c[8214] = 32848;
   c[8217] = 32856;
   c[8216] = 32856;
   c[8219] = 32864;
   c[8218] = 32864;
   p = a + -40 | 0;
   n = e + 8 | 0;
   n = (n & 7 | 0) == 0 ? 0 : 0 - n & 7;
   o = e + n | 0;
   n = p - n | 0;
   c[8150] = o;
   c[8147] = n;
   c[o + 4 >> 2] = n | 1;
   c[e + p + 4 >> 2] = 40;
   c[8151] = c[8266];
  } else {
   b = 33024;
   do {
    d = c[b >> 2] | 0;
    f = c[b + 4 >> 2] | 0;
    if ((e | 0) == (d + f | 0)) {
     p = 154;
     break;
    }
    b = c[b + 8 >> 2] | 0;
   } while ((b | 0) != 0);
   if ((p | 0) == 154) {
    g = b + 4 | 0;
    if (!(c[b + 12 >> 2] & 8)) if (e >>> 0 > j >>> 0 & d >>> 0 <= j >>> 0) {
     c[g >> 2] = f + a;
     p = (c[8147] | 0) + a | 0;
     n = j + 8 | 0;
     n = (n & 7 | 0) == 0 ? 0 : 0 - n & 7;
     o = j + n | 0;
     n = p - n | 0;
     c[8150] = o;
     c[8147] = n;
     c[o + 4 >> 2] = n | 1;
     c[j + p + 4 >> 2] = 40;
     c[8151] = c[8266];
     break;
    }
   }
   if (e >>> 0 < (c[8148] | 0) >>> 0) c[8148] = e;
   d = e + a | 0;
   b = 33024;
   do {
    if ((c[b >> 2] | 0) == (d | 0)) {
     p = 162;
     break;
    }
    b = c[b + 8 >> 2] | 0;
   } while ((b | 0) != 0);
   if ((p | 0) == 162) if (!(c[b + 12 >> 2] & 8)) {
    c[b >> 2] = e;
    n = b + 4 | 0;
    c[n >> 2] = (c[n >> 2] | 0) + a;
    n = e + 8 | 0;
    n = e + ((n & 7 | 0) == 0 ? 0 : 0 - n & 7) | 0;
    a = d + 8 | 0;
    a = d + ((a & 7 | 0) == 0 ? 0 : 0 - a & 7) | 0;
    m = n + l | 0;
    i = a - n - l | 0;
    c[n + 4 >> 2] = l | 3;
    g : do if ((j | 0) == (a | 0)) {
     p = (c[8147] | 0) + i | 0;
     c[8147] = p;
     c[8150] = m;
     c[m + 4 >> 2] = p | 1;
    } else {
     if ((c[8149] | 0) == (a | 0)) {
      p = (c[8146] | 0) + i | 0;
      c[8146] = p;
      c[8149] = m;
      c[m + 4 >> 2] = p | 1;
      c[m + p >> 2] = p;
      break;
     }
     b = c[a + 4 >> 2] | 0;
     if ((b & 3 | 0) == 1) {
      h = b & -8;
      e = b >>> 3;
      h : do if (b >>> 0 < 256) {
       b = c[a + 8 >> 2] | 0;
       d = c[a + 12 >> 2] | 0;
       if ((d | 0) == (b | 0)) {
        c[8144] = c[8144] & ~(1 << e);
        break;
       } else {
        c[b + 12 >> 2] = d;
        c[d + 8 >> 2] = b;
        break;
       }
      } else {
       g = c[a + 24 >> 2] | 0;
       b = c[a + 12 >> 2] | 0;
       do if ((b | 0) == (a | 0)) {
        d = a + 16 | 0;
        e = d + 4 | 0;
        b = c[e >> 2] | 0;
        if (!b) {
         b = c[d >> 2] | 0;
         if (!b) {
          b = 0;
          break;
         }
        } else d = e;
        while (1) {
         f = b + 20 | 0;
         e = c[f >> 2] | 0;
         if (!e) {
          f = b + 16 | 0;
          e = c[f >> 2] | 0;
          if (!e) break; else {
           b = e;
           d = f;
          }
         } else {
          b = e;
          d = f;
         }
        }
        c[d >> 2] = 0;
       } else {
        p = c[a + 8 >> 2] | 0;
        c[p + 12 >> 2] = b;
        c[b + 8 >> 2] = p;
       } while (0);
       if (!g) break;
       d = c[a + 28 >> 2] | 0;
       e = 32880 + (d << 2) | 0;
       do if ((c[e >> 2] | 0) == (a | 0)) {
        c[e >> 2] = b;
        if (b | 0) break;
        c[8145] = c[8145] & ~(1 << d);
        break h;
       } else {
        p = g + 16 | 0;
        c[((c[p >> 2] | 0) == (a | 0) ? p : g + 20 | 0) >> 2] = b;
        if (!b) break h;
       } while (0);
       c[b + 24 >> 2] = g;
       d = a + 16 | 0;
       e = c[d >> 2] | 0;
       if (e | 0) {
        c[b + 16 >> 2] = e;
        c[e + 24 >> 2] = b;
       }
       d = c[d + 4 >> 2] | 0;
       if (!d) break;
       c[b + 20 >> 2] = d;
       c[d + 24 >> 2] = b;
      } while (0);
      a = a + h | 0;
      f = h + i | 0;
     } else f = i;
     a = a + 4 | 0;
     c[a >> 2] = c[a >> 2] & -2;
     c[m + 4 >> 2] = f | 1;
     c[m + f >> 2] = f;
     a = f >>> 3;
     if (f >>> 0 < 256) {
      d = 32616 + (a << 1 << 2) | 0;
      b = c[8144] | 0;
      a = 1 << a;
      if (!(b & a)) {
       c[8144] = b | a;
       a = d;
       b = d + 8 | 0;
      } else {
       b = d + 8 | 0;
       a = c[b >> 2] | 0;
      }
      c[b >> 2] = m;
      c[a + 12 >> 2] = m;
      c[m + 8 >> 2] = a;
      c[m + 12 >> 2] = d;
      break;
     }
     a = f >>> 8;
     do if (!a) e = 0; else {
      if (f >>> 0 > 16777215) {
       e = 31;
       break;
      }
      o = (a + 1048320 | 0) >>> 16 & 8;
      p = a << o;
      l = (p + 520192 | 0) >>> 16 & 4;
      p = p << l;
      e = (p + 245760 | 0) >>> 16 & 2;
      e = 14 - (l | o | e) + (p << e >>> 15) | 0;
      e = f >>> (e + 7 | 0) & 1 | e << 1;
     } while (0);
     a = 32880 + (e << 2) | 0;
     c[m + 28 >> 2] = e;
     b = m + 16 | 0;
     c[b + 4 >> 2] = 0;
     c[b >> 2] = 0;
     b = c[8145] | 0;
     d = 1 << e;
     if (!(b & d)) {
      c[8145] = b | d;
      c[a >> 2] = m;
      c[m + 24 >> 2] = a;
      c[m + 12 >> 2] = m;
      c[m + 8 >> 2] = m;
      break;
     }
     a = c[a >> 2] | 0;
     i : do if ((c[a + 4 >> 2] & -8 | 0) != (f | 0)) {
      e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
      while (1) {
       d = a + 16 + (e >>> 31 << 2) | 0;
       b = c[d >> 2] | 0;
       if (!b) break;
       if ((c[b + 4 >> 2] & -8 | 0) == (f | 0)) {
        a = b;
        break i;
       } else {
        e = e << 1;
        a = b;
       }
      }
      c[d >> 2] = m;
      c[m + 24 >> 2] = a;
      c[m + 12 >> 2] = m;
      c[m + 8 >> 2] = m;
      break g;
     } while (0);
     o = a + 8 | 0;
     p = c[o >> 2] | 0;
     c[p + 12 >> 2] = m;
     c[o >> 2] = m;
     c[m + 8 >> 2] = p;
     c[m + 12 >> 2] = a;
     c[m + 24 >> 2] = 0;
    } while (0);
    p = n + 8 | 0;
    k = q;
    return p | 0;
   }
   d = 33024;
   while (1) {
    b = c[d >> 2] | 0;
    if (b >>> 0 <= j >>> 0) {
     b = b + (c[d + 4 >> 2] | 0) | 0;
     if (b >>> 0 > j >>> 0) break;
    }
    d = c[d + 8 >> 2] | 0;
   }
   g = b + -47 | 0;
   d = g + 8 | 0;
   d = g + ((d & 7 | 0) == 0 ? 0 : 0 - d & 7) | 0;
   g = j + 16 | 0;
   d = d >>> 0 < g >>> 0 ? j : d;
   p = d + 8 | 0;
   f = a + -40 | 0;
   n = e + 8 | 0;
   n = (n & 7 | 0) == 0 ? 0 : 0 - n & 7;
   o = e + n | 0;
   n = f - n | 0;
   c[8150] = o;
   c[8147] = n;
   c[o + 4 >> 2] = n | 1;
   c[e + f + 4 >> 2] = 40;
   c[8151] = c[8266];
   f = d + 4 | 0;
   c[f >> 2] = 27;
   c[p >> 2] = c[8256];
   c[p + 4 >> 2] = c[8257];
   c[p + 8 >> 2] = c[8258];
   c[p + 12 >> 2] = c[8259];
   c[8256] = e;
   c[8257] = a;
   c[8259] = 0;
   c[8258] = p;
   a = d + 24 | 0;
   do {
    p = a;
    a = a + 4 | 0;
    c[a >> 2] = 7;
   } while ((p + 8 | 0) >>> 0 < b >>> 0);
   if ((d | 0) != (j | 0)) {
    h = d - j | 0;
    c[f >> 2] = c[f >> 2] & -2;
    c[j + 4 >> 2] = h | 1;
    c[d >> 2] = h;
    a = h >>> 3;
    if (h >>> 0 < 256) {
     d = 32616 + (a << 1 << 2) | 0;
     b = c[8144] | 0;
     a = 1 << a;
     if (!(b & a)) {
      c[8144] = b | a;
      a = d;
      b = d + 8 | 0;
     } else {
      b = d + 8 | 0;
      a = c[b >> 2] | 0;
     }
     c[b >> 2] = j;
     c[a + 12 >> 2] = j;
     c[j + 8 >> 2] = a;
     c[j + 12 >> 2] = d;
     break;
    }
    a = h >>> 8;
    if (!a) e = 0; else if (h >>> 0 > 16777215) e = 31; else {
     o = (a + 1048320 | 0) >>> 16 & 8;
     p = a << o;
     n = (p + 520192 | 0) >>> 16 & 4;
     p = p << n;
     e = (p + 245760 | 0) >>> 16 & 2;
     e = 14 - (n | o | e) + (p << e >>> 15) | 0;
     e = h >>> (e + 7 | 0) & 1 | e << 1;
    }
    d = 32880 + (e << 2) | 0;
    c[j + 28 >> 2] = e;
    c[j + 20 >> 2] = 0;
    c[g >> 2] = 0;
    a = c[8145] | 0;
    b = 1 << e;
    if (!(a & b)) {
     c[8145] = a | b;
     c[d >> 2] = j;
     c[j + 24 >> 2] = d;
     c[j + 12 >> 2] = j;
     c[j + 8 >> 2] = j;
     break;
    }
    a = c[d >> 2] | 0;
    j : do if ((c[a + 4 >> 2] & -8 | 0) != (h | 0)) {
     e = h << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
     while (1) {
      d = a + 16 + (e >>> 31 << 2) | 0;
      b = c[d >> 2] | 0;
      if (!b) break;
      if ((c[b + 4 >> 2] & -8 | 0) == (h | 0)) {
       a = b;
       break j;
      } else {
       e = e << 1;
       a = b;
      }
     }
     c[d >> 2] = j;
     c[j + 24 >> 2] = a;
     c[j + 12 >> 2] = j;
     c[j + 8 >> 2] = j;
     break f;
    } while (0);
    o = a + 8 | 0;
    p = c[o >> 2] | 0;
    c[p + 12 >> 2] = j;
    c[o >> 2] = j;
    c[j + 8 >> 2] = p;
    c[j + 12 >> 2] = a;
    c[j + 24 >> 2] = 0;
   }
  } while (0);
  a = c[8147] | 0;
  if (a >>> 0 > l >>> 0) {
   n = a - l | 0;
   c[8147] = n;
   p = c[8150] | 0;
   o = p + l | 0;
   c[8150] = o;
   c[o + 4 >> 2] = n | 1;
   c[p + 4 >> 2] = l | 3;
   p = p + 8 | 0;
   k = q;
   return p | 0;
  }
 }
 c[(Jb() | 0) >> 2] = 12;
 p = 0;
 k = q;
 return p | 0;
}

function vb(b) {
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0;
 $ = b + 1 | 0;
 Y = b + 2 | 0;
 ga = wb(a[b >> 0] | 0, a[$ >> 0] | 0, a[Y >> 0] | 0) | 0;
 ja = xb(Y) | 0;
 ja = Ob(ja | 0, x | 0, 5) | 0;
 U = b + 5 | 0;
 S = b + 6 | 0;
 P = b + 7 | 0;
 l = wb(a[U >> 0] | 0, a[S >> 0] | 0, a[P >> 0] | 0) | 0;
 l = Ob(l | 0, x | 0, 2) | 0;
 A = xb(P) | 0;
 A = Ob(A | 0, x | 0, 7) | 0;
 L = b + 10 | 0;
 ha = xb(L) | 0;
 ha = Ob(ha | 0, x | 0, 4) | 0;
 H = b + 13 | 0;
 F = b + 14 | 0;
 C = b + 15 | 0;
 na = wb(a[H >> 0] | 0, a[F >> 0] | 0, a[C >> 0] | 0) | 0;
 na = Ob(na | 0, x | 0, 1) | 0;
 W = xb(C) | 0;
 W = Ob(W | 0, x | 0, 6) | 0;
 y = b + 18 | 0;
 w = b + 19 | 0;
 t = b + 20 | 0;
 Aa = wb(a[y >> 0] | 0, a[w >> 0] | 0, a[t >> 0] | 0) | 0;
 Aa = Ob(Aa | 0, x | 0, 3) | 0;
 s = b + 21 | 0;
 r = b + 22 | 0;
 o = b + 23 | 0;
 Fa = wb(a[s >> 0] | 0, a[r >> 0] | 0, a[o >> 0] | 0) | 0;
 xa = xb(o) | 0;
 xa = Ob(xa | 0, x | 0, 5) | 0;
 k = b + 26 | 0;
 i = b + 27 | 0;
 f = b + 28 | 0;
 Ea = wb(a[k >> 0] | 0, a[i >> 0] | 0, a[f >> 0] | 0) | 0;
 Ea = Ob(Ea | 0, x | 0, 2) | 0;
 sa = xb(f) | 0;
 sa = Ob(sa | 0, x | 0, 7) | 0;
 c = b + 31 | 0;
 Ja = xb(c) | 0;
 Ja = Ob(Ja | 0, x | 0, 4) | 0;
 ea = b + 36 | 0;
 _ = wb(a[b + 34 >> 0] | 0, a[b + 35 >> 0] | 0, a[ea >> 0] | 0) | 0;
 _ = Ob(_ | 0, x | 0, 1) | 0;
 ea = xb(ea) | 0;
 ea = Ob(ea | 0, x | 0, 6) | 0;
 V = wb(a[b + 39 >> 0] | 0, a[b + 40 >> 0] | 0, a[b + 41 >> 0] | 0) | 0;
 V = Ob(V | 0, x | 0, 3) | 0;
 ca = b + 44 | 0;
 j = wb(a[b + 42 >> 0] | 0, a[b + 43 >> 0] | 0, a[ca >> 0] | 0) | 0;
 ca = xb(ca) | 0;
 ca = Ob(ca | 0, x | 0, 5) | 0;
 Ka = b + 49 | 0;
 ua = wb(a[b + 47 >> 0] | 0, a[b + 48 >> 0] | 0, a[Ka >> 0] | 0) | 0;
 ua = Ob(ua | 0, x | 0, 2) | 0;
 ua = ua & 2097151;
 Ka = xb(Ka) | 0;
 Ka = Ob(Ka | 0, x | 0, 7) | 0;
 Ka = Ka & 2097151;
 N = xb(b + 52 | 0) | 0;
 N = Ob(N | 0, x | 0, 4) | 0;
 N = N & 2097151;
 p = b + 57 | 0;
 Z = wb(a[b + 55 >> 0] | 0, a[b + 56 >> 0] | 0, a[p >> 0] | 0) | 0;
 Z = Ob(Z | 0, x | 0, 1) | 0;
 Z = Z & 2097151;
 p = xb(p) | 0;
 p = Ob(p | 0, x | 0, 6) | 0;
 p = p & 2097151;
 ia = xb(b + 60 | 0) | 0;
 ia = Ob(ia | 0, x | 0, 3) | 0;
 m = x;
 G = Mb(ia | 0, m | 0, 666643, 0) | 0;
 E = x;
 Ca = Mb(ia | 0, m | 0, 470296, 0) | 0;
 K = x;
 u = Mb(ia | 0, m | 0, 654183, 0) | 0;
 B = x;
 R = Mb(ia | 0, m | 0, -997805, -1) | 0;
 q = x;
 D = Mb(ia | 0, m | 0, 136657, 0) | 0;
 V = Qb(D | 0, x | 0, V & 2097151 | 0, 0) | 0;
 D = x;
 m = Mb(ia | 0, m | 0, -683901, -1) | 0;
 j = Qb(m | 0, x | 0, j & 2097151 | 0, 0) | 0;
 m = x;
 ia = Mb(p | 0, 0, 666643, 0) | 0;
 da = x;
 O = Mb(p | 0, 0, 470296, 0) | 0;
 qa = x;
 n = Mb(p | 0, 0, 654183, 0) | 0;
 e = x;
 la = Mb(p | 0, 0, -997805, -1) | 0;
 ka = x;
 fa = Mb(p | 0, 0, 136657, 0) | 0;
 Q = x;
 p = Mb(p | 0, 0, -683901, -1) | 0;
 p = Qb(V | 0, D | 0, p | 0, x | 0) | 0;
 D = x;
 V = Mb(Z | 0, 0, 666643, 0) | 0;
 ma = x;
 X = Mb(Z | 0, 0, 470296, 0) | 0;
 ta = x;
 ba = Mb(Z | 0, 0, 654183, 0) | 0;
 J = x;
 Ga = Mb(Z | 0, 0, -997805, -1) | 0;
 Ba = x;
 pa = Mb(Z | 0, 0, 136657, 0) | 0;
 h = x;
 Z = Mb(Z | 0, 0, -683901, -1) | 0;
 ea = Qb(Z | 0, x | 0, ea & 2097151 | 0, 0) | 0;
 q = Qb(ea | 0, x | 0, R | 0, q | 0) | 0;
 Q = Qb(q | 0, x | 0, fa | 0, Q | 0) | 0;
 fa = x;
 q = Mb(N | 0, 0, 666643, 0) | 0;
 R = x;
 ea = Mb(N | 0, 0, 470296, 0) | 0;
 Z = x;
 M = Mb(N | 0, 0, 654183, 0) | 0;
 oa = x;
 d = Mb(N | 0, 0, -997805, -1) | 0;
 g = x;
 Ia = Mb(N | 0, 0, 136657, 0) | 0;
 Ha = x;
 N = Mb(N | 0, 0, -683901, -1) | 0;
 v = x;
 I = Mb(Ka | 0, 0, 666643, 0) | 0;
 z = x;
 ya = Mb(Ka | 0, 0, 470296, 0) | 0;
 za = x;
 wa = Mb(Ka | 0, 0, 654183, 0) | 0;
 va = x;
 Da = Mb(Ka | 0, 0, -997805, -1) | 0;
 aa = x;
 ra = Mb(Ka | 0, 0, 136657, 0) | 0;
 T = x;
 Ka = Mb(Ka | 0, 0, -683901, -1) | 0;
 Ja = Qb(Ka | 0, x | 0, Ja & 2097151 | 0, 0) | 0;
 Ha = Qb(Ja | 0, x | 0, Ia | 0, Ha | 0) | 0;
 Ba = Qb(Ha | 0, x | 0, Ga | 0, Ba | 0) | 0;
 K = Qb(Ba | 0, x | 0, Ca | 0, K | 0) | 0;
 e = Qb(K | 0, x | 0, n | 0, e | 0) | 0;
 n = x;
 K = Mb(ua | 0, 0, 666643, 0) | 0;
 W = Qb(K | 0, x | 0, W & 2097151 | 0, 0) | 0;
 K = x;
 Ca = Mb(ua | 0, 0, 470296, 0) | 0;
 Ba = x;
 Ga = Mb(ua | 0, 0, 654183, 0) | 0;
 Fa = Qb(Ga | 0, x | 0, Fa & 2097151 | 0, 0) | 0;
 za = Qb(Fa | 0, x | 0, ya | 0, za | 0) | 0;
 R = Qb(za | 0, x | 0, q | 0, R | 0) | 0;
 q = x;
 za = Mb(ua | 0, 0, -997805, -1) | 0;
 ya = x;
 Fa = Mb(ua | 0, 0, 136657, 0) | 0;
 Ea = Qb(Fa | 0, x | 0, Ea & 2097151 | 0, 0) | 0;
 aa = Qb(Ea | 0, x | 0, Da | 0, aa | 0) | 0;
 oa = Qb(aa | 0, x | 0, M | 0, oa | 0) | 0;
 ta = Qb(oa | 0, x | 0, X | 0, ta | 0) | 0;
 da = Qb(ta | 0, x | 0, ia | 0, da | 0) | 0;
 ia = x;
 ua = Mb(ua | 0, 0, -683901, -1) | 0;
 ta = x;
 X = Qb(W | 0, K | 0, 1048576, 0) | 0;
 oa = x;
 M = Ob(X | 0, oa | 0, 21) | 0;
 aa = x;
 Aa = Qb(Ca | 0, Ba | 0, Aa & 2097151 | 0, 0) | 0;
 z = Qb(Aa | 0, x | 0, I | 0, z | 0) | 0;
 aa = Qb(z | 0, x | 0, M | 0, aa | 0) | 0;
 M = x;
 oa = Rb(W | 0, K | 0, X & -2097152 | 0, oa & 2047 | 0) | 0;
 X = x;
 K = Qb(R | 0, q | 0, 1048576, 0) | 0;
 W = x;
 z = Ob(K | 0, W | 0, 21) | 0;
 I = x;
 xa = Qb(za | 0, ya | 0, xa & 2097151 | 0, 0) | 0;
 va = Qb(xa | 0, x | 0, wa | 0, va | 0) | 0;
 Z = Qb(va | 0, x | 0, ea | 0, Z | 0) | 0;
 ma = Qb(Z | 0, x | 0, V | 0, ma | 0) | 0;
 I = Qb(ma | 0, x | 0, z | 0, I | 0) | 0;
 z = x;
 ma = Qb(da | 0, ia | 0, 1048576, 0) | 0;
 V = x;
 Z = Nb(ma | 0, V | 0, 21) | 0;
 ea = x;
 sa = Qb(ua | 0, ta | 0, sa & 2097151 | 0, 0) | 0;
 T = Qb(sa | 0, x | 0, ra | 0, T | 0) | 0;
 g = Qb(T | 0, x | 0, d | 0, g | 0) | 0;
 J = Qb(g | 0, x | 0, ba | 0, J | 0) | 0;
 E = Qb(J | 0, x | 0, G | 0, E | 0) | 0;
 qa = Qb(E | 0, x | 0, O | 0, qa | 0) | 0;
 ea = Qb(qa | 0, x | 0, Z | 0, ea | 0) | 0;
 Z = x;
 qa = Qb(e | 0, n | 0, 1048576, 0) | 0;
 O = x;
 E = Nb(qa | 0, O | 0, 21) | 0;
 G = x;
 _ = Qb(N | 0, v | 0, _ & 2097151 | 0, 0) | 0;
 h = Qb(_ | 0, x | 0, pa | 0, h | 0) | 0;
 B = Qb(h | 0, x | 0, u | 0, B | 0) | 0;
 ka = Qb(B | 0, x | 0, la | 0, ka | 0) | 0;
 G = Qb(ka | 0, x | 0, E | 0, G | 0) | 0;
 E = x;
 O = Rb(e | 0, n | 0, qa & -2097152 | 0, O | 0) | 0;
 qa = x;
 n = Qb(Q | 0, fa | 0, 1048576, 0) | 0;
 e = x;
 ka = Nb(n | 0, e | 0, 21) | 0;
 ka = Qb(p | 0, D | 0, ka | 0, x | 0) | 0;
 D = x;
 e = Rb(Q | 0, fa | 0, n & -2097152 | 0, e | 0) | 0;
 n = x;
 fa = Qb(j | 0, m | 0, 1048576, 0) | 0;
 Q = x;
 p = Nb(fa | 0, Q | 0, 21) | 0;
 ca = Qb(p | 0, x | 0, ca & 2097151 | 0, 0) | 0;
 p = x;
 Q = Rb(j | 0, m | 0, fa & -2097152 | 0, Q | 0) | 0;
 fa = x;
 m = Qb(aa | 0, M | 0, 1048576, 0) | 0;
 j = x;
 la = Ob(m | 0, j | 0, 21) | 0;
 B = x;
 j = Rb(aa | 0, M | 0, m & -2097152 | 0, j | 0) | 0;
 m = x;
 M = Qb(I | 0, z | 0, 1048576, 0) | 0;
 aa = x;
 u = Nb(M | 0, aa | 0, 21) | 0;
 h = x;
 pa = Qb(ea | 0, Z | 0, 1048576, 0) | 0;
 _ = x;
 v = Nb(pa | 0, _ | 0, 21) | 0;
 qa = Qb(v | 0, x | 0, O | 0, qa | 0) | 0;
 O = x;
 _ = Rb(ea | 0, Z | 0, pa & -2097152 | 0, _ | 0) | 0;
 pa = x;
 Z = Qb(G | 0, E | 0, 1048576, 0) | 0;
 ea = x;
 v = Nb(Z | 0, ea | 0, 21) | 0;
 n = Qb(v | 0, x | 0, e | 0, n | 0) | 0;
 e = x;
 ea = Rb(G | 0, E | 0, Z & -2097152 | 0, ea | 0) | 0;
 Z = x;
 E = Qb(ka | 0, D | 0, 1048576, 0) | 0;
 G = x;
 v = Nb(E | 0, G | 0, 21) | 0;
 fa = Qb(v | 0, x | 0, Q | 0, fa | 0) | 0;
 Q = x;
 G = Rb(ka | 0, D | 0, E & -2097152 | 0, G | 0) | 0;
 E = x;
 D = Mb(ca | 0, p | 0, 666643, 0) | 0;
 na = Qb(D | 0, x | 0, na & 2097151 | 0, 0) | 0;
 D = x;
 ka = Mb(ca | 0, p | 0, 470296, 0) | 0;
 ka = Qb(oa | 0, X | 0, ka | 0, x | 0) | 0;
 X = x;
 oa = Mb(ca | 0, p | 0, 654183, 0) | 0;
 oa = Qb(j | 0, m | 0, oa | 0, x | 0) | 0;
 m = x;
 j = Mb(ca | 0, p | 0, -997805, -1) | 0;
 v = x;
 N = Mb(ca | 0, p | 0, 136657, 0) | 0;
 J = x;
 p = Mb(ca | 0, p | 0, -683901, -1) | 0;
 ia = Qb(p | 0, x | 0, da | 0, ia | 0) | 0;
 h = Qb(ia | 0, x | 0, u | 0, h | 0) | 0;
 V = Rb(h | 0, x | 0, ma & -2097152 | 0, V | 0) | 0;
 ma = x;
 h = Mb(fa | 0, Q | 0, 666643, 0) | 0;
 ha = Qb(h | 0, x | 0, ha & 2097151 | 0, 0) | 0;
 h = x;
 u = Mb(fa | 0, Q | 0, 470296, 0) | 0;
 u = Qb(na | 0, D | 0, u | 0, x | 0) | 0;
 D = x;
 na = Mb(fa | 0, Q | 0, 654183, 0) | 0;
 na = Qb(ka | 0, X | 0, na | 0, x | 0) | 0;
 X = x;
 ka = Mb(fa | 0, Q | 0, -997805, -1) | 0;
 ka = Qb(oa | 0, m | 0, ka | 0, x | 0) | 0;
 m = x;
 oa = Mb(fa | 0, Q | 0, 136657, 0) | 0;
 ia = x;
 Q = Mb(fa | 0, Q | 0, -683901, -1) | 0;
 fa = x;
 da = Mb(G | 0, E | 0, 666643, 0) | 0;
 A = Qb(da | 0, x | 0, A & 2097151 | 0, 0) | 0;
 da = x;
 p = Mb(G | 0, E | 0, 470296, 0) | 0;
 p = Qb(ha | 0, h | 0, p | 0, x | 0) | 0;
 h = x;
 ha = Mb(G | 0, E | 0, 654183, 0) | 0;
 ha = Qb(u | 0, D | 0, ha | 0, x | 0) | 0;
 D = x;
 u = Mb(G | 0, E | 0, -997805, -1) | 0;
 u = Qb(na | 0, X | 0, u | 0, x | 0) | 0;
 X = x;
 na = Mb(G | 0, E | 0, 136657, 0) | 0;
 na = Qb(ka | 0, m | 0, na | 0, x | 0) | 0;
 m = x;
 E = Mb(G | 0, E | 0, -683901, -1) | 0;
 G = x;
 q = Qb(la | 0, B | 0, R | 0, q | 0) | 0;
 W = Rb(q | 0, x | 0, K & -2097152 | 0, W | 0) | 0;
 v = Qb(W | 0, x | 0, j | 0, v | 0) | 0;
 ia = Qb(v | 0, x | 0, oa | 0, ia | 0) | 0;
 G = Qb(ia | 0, x | 0, E | 0, G | 0) | 0;
 E = x;
 ia = Mb(n | 0, e | 0, 666643, 0) | 0;
 l = Qb(ia | 0, x | 0, l & 2097151 | 0, 0) | 0;
 ia = x;
 oa = Mb(n | 0, e | 0, 470296, 0) | 0;
 oa = Qb(A | 0, da | 0, oa | 0, x | 0) | 0;
 da = x;
 A = Mb(n | 0, e | 0, 654183, 0) | 0;
 A = Qb(p | 0, h | 0, A | 0, x | 0) | 0;
 h = x;
 p = Mb(n | 0, e | 0, -997805, -1) | 0;
 p = Qb(ha | 0, D | 0, p | 0, x | 0) | 0;
 D = x;
 ha = Mb(n | 0, e | 0, 136657, 0) | 0;
 ha = Qb(u | 0, X | 0, ha | 0, x | 0) | 0;
 X = x;
 e = Mb(n | 0, e | 0, -683901, -1) | 0;
 e = Qb(na | 0, m | 0, e | 0, x | 0) | 0;
 m = x;
 na = Mb(ea | 0, Z | 0, 666643, 0) | 0;
 ja = Qb(na | 0, x | 0, ja & 2097151 | 0, 0) | 0;
 na = x;
 n = Mb(ea | 0, Z | 0, 470296, 0) | 0;
 n = Qb(l | 0, ia | 0, n | 0, x | 0) | 0;
 ia = x;
 l = Mb(ea | 0, Z | 0, 654183, 0) | 0;
 l = Qb(oa | 0, da | 0, l | 0, x | 0) | 0;
 da = x;
 oa = Mb(ea | 0, Z | 0, -997805, -1) | 0;
 oa = Qb(A | 0, h | 0, oa | 0, x | 0) | 0;
 h = x;
 A = Mb(ea | 0, Z | 0, 136657, 0) | 0;
 A = Qb(p | 0, D | 0, A | 0, x | 0) | 0;
 D = x;
 Z = Mb(ea | 0, Z | 0, -683901, -1) | 0;
 Z = Qb(ha | 0, X | 0, Z | 0, x | 0) | 0;
 X = x;
 ha = Mb(qa | 0, O | 0, 666643, 0) | 0;
 ga = Qb(ha | 0, x | 0, ga & 2097151 | 0, 0) | 0;
 ha = x;
 ea = Mb(qa | 0, O | 0, 470296, 0) | 0;
 ea = Qb(ja | 0, na | 0, ea | 0, x | 0) | 0;
 na = x;
 ja = Mb(qa | 0, O | 0, 654183, 0) | 0;
 ja = Qb(n | 0, ia | 0, ja | 0, x | 0) | 0;
 ia = x;
 n = Mb(qa | 0, O | 0, -997805, -1) | 0;
 n = Qb(l | 0, da | 0, n | 0, x | 0) | 0;
 da = x;
 l = Mb(qa | 0, O | 0, 136657, 0) | 0;
 l = Qb(oa | 0, h | 0, l | 0, x | 0) | 0;
 h = x;
 O = Mb(qa | 0, O | 0, -683901, -1) | 0;
 O = Qb(A | 0, D | 0, O | 0, x | 0) | 0;
 D = x;
 A = Qb(ga | 0, ha | 0, 1048576, 0) | 0;
 qa = x;
 oa = Nb(A | 0, qa | 0, 21) | 0;
 oa = Qb(ea | 0, na | 0, oa | 0, x | 0) | 0;
 na = x;
 qa = Rb(ga | 0, ha | 0, A & -2097152 | 0, qa | 0) | 0;
 A = x;
 ha = Qb(ja | 0, ia | 0, 1048576, 0) | 0;
 ga = x;
 ea = Nb(ha | 0, ga | 0, 21) | 0;
 ea = Qb(n | 0, da | 0, ea | 0, x | 0) | 0;
 da = x;
 n = Qb(l | 0, h | 0, 1048576, 0) | 0;
 p = x;
 u = Nb(n | 0, p | 0, 21) | 0;
 u = Qb(O | 0, D | 0, u | 0, x | 0) | 0;
 D = x;
 O = Qb(Z | 0, X | 0, 1048576, 0) | 0;
 v = x;
 j = Nb(O | 0, v | 0, 21) | 0;
 j = Qb(e | 0, m | 0, j | 0, x | 0) | 0;
 m = x;
 v = Rb(Z | 0, X | 0, O & -2097152 | 0, v | 0) | 0;
 O = x;
 X = Qb(G | 0, E | 0, 1048576, 0) | 0;
 Z = x;
 e = Nb(X | 0, Z | 0, 21) | 0;
 W = x;
 z = Qb(N | 0, J | 0, I | 0, z | 0) | 0;
 aa = Rb(z | 0, x | 0, M & -2097152 | 0, aa | 0) | 0;
 fa = Qb(aa | 0, x | 0, Q | 0, fa | 0) | 0;
 W = Qb(fa | 0, x | 0, e | 0, W | 0) | 0;
 e = x;
 Z = Rb(G | 0, E | 0, X & -2097152 | 0, Z | 0) | 0;
 X = x;
 E = Qb(V | 0, ma | 0, 1048576, 0) | 0;
 G = x;
 fa = Nb(E | 0, G | 0, 21) | 0;
 pa = Qb(fa | 0, x | 0, _ | 0, pa | 0) | 0;
 _ = x;
 G = Rb(V | 0, ma | 0, E & -2097152 | 0, G | 0) | 0;
 E = x;
 ma = Qb(oa | 0, na | 0, 1048576, 0) | 0;
 V = x;
 fa = Nb(ma | 0, V | 0, 21) | 0;
 Q = x;
 aa = Qb(ea | 0, da | 0, 1048576, 0) | 0;
 M = x;
 z = Nb(aa | 0, M | 0, 21) | 0;
 I = x;
 J = Qb(u | 0, D | 0, 1048576, 0) | 0;
 N = x;
 K = Nb(J | 0, N | 0, 21) | 0;
 K = Qb(v | 0, O | 0, K | 0, x | 0) | 0;
 O = x;
 v = Qb(j | 0, m | 0, 1048576, 0) | 0;
 q = x;
 R = Nb(v | 0, q | 0, 21) | 0;
 R = Qb(Z | 0, X | 0, R | 0, x | 0) | 0;
 X = x;
 q = Rb(j | 0, m | 0, v & -2097152 | 0, q | 0) | 0;
 v = x;
 m = Qb(W | 0, e | 0, 1048576, 0) | 0;
 j = x;
 Z = Nb(m | 0, j | 0, 21) | 0;
 Z = Qb(G | 0, E | 0, Z | 0, x | 0) | 0;
 E = x;
 j = Rb(W | 0, e | 0, m & -2097152 | 0, j | 0) | 0;
 m = x;
 e = Qb(pa | 0, _ | 0, 1048576, 0) | 0;
 W = x;
 G = Nb(e | 0, W | 0, 21) | 0;
 B = x;
 W = Rb(pa | 0, _ | 0, e & -2097152 | 0, W | 0) | 0;
 e = x;
 _ = Mb(G | 0, B | 0, 666643, 0) | 0;
 _ = Qb(qa | 0, A | 0, _ | 0, x | 0) | 0;
 A = x;
 qa = Mb(G | 0, B | 0, 470296, 0) | 0;
 pa = x;
 la = Mb(G | 0, B | 0, 654183, 0) | 0;
 ka = x;
 ca = Mb(G | 0, B | 0, -997805, -1) | 0;
 ba = x;
 g = Mb(G | 0, B | 0, 136657, 0) | 0;
 d = x;
 B = Mb(G | 0, B | 0, -683901, -1) | 0;
 G = x;
 A = Nb(_ | 0, A | 0, 21) | 0;
 T = x;
 na = Qb(qa | 0, pa | 0, oa | 0, na | 0) | 0;
 V = Rb(na | 0, x | 0, ma & -2097152 | 0, V | 0) | 0;
 T = Qb(V | 0, x | 0, A | 0, T | 0) | 0;
 A = Nb(T | 0, x | 0, 21) | 0;
 V = x;
 ia = Qb(la | 0, ka | 0, ja | 0, ia | 0) | 0;
 ga = Rb(ia | 0, x | 0, ha & -2097152 | 0, ga | 0) | 0;
 Q = Qb(ga | 0, x | 0, fa | 0, Q | 0) | 0;
 V = Qb(Q | 0, x | 0, A | 0, V | 0) | 0;
 A = Nb(V | 0, x | 0, 21) | 0;
 Q = x;
 ba = Qb(ea | 0, da | 0, ca | 0, ba | 0) | 0;
 M = Rb(ba | 0, x | 0, aa & -2097152 | 0, M | 0) | 0;
 Q = Qb(M | 0, x | 0, A | 0, Q | 0) | 0;
 A = Nb(Q | 0, x | 0, 21) | 0;
 M = x;
 h = Qb(g | 0, d | 0, l | 0, h | 0) | 0;
 p = Rb(h | 0, x | 0, n & -2097152 | 0, p | 0) | 0;
 I = Qb(p | 0, x | 0, z | 0, I | 0) | 0;
 M = Qb(I | 0, x | 0, A | 0, M | 0) | 0;
 A = Nb(M | 0, x | 0, 21) | 0;
 I = x;
 G = Qb(u | 0, D | 0, B | 0, G | 0) | 0;
 N = Rb(G | 0, x | 0, J & -2097152 | 0, N | 0) | 0;
 I = Qb(N | 0, x | 0, A | 0, I | 0) | 0;
 A = Nb(I | 0, x | 0, 21) | 0;
 A = Qb(K | 0, O | 0, A | 0, x | 0) | 0;
 O = Nb(A | 0, x | 0, 21) | 0;
 v = Qb(O | 0, x | 0, q | 0, v | 0) | 0;
 q = Nb(v | 0, x | 0, 21) | 0;
 q = Qb(R | 0, X | 0, q | 0, x | 0) | 0;
 X = Nb(q | 0, x | 0, 21) | 0;
 m = Qb(X | 0, x | 0, j | 0, m | 0) | 0;
 j = Nb(m | 0, x | 0, 21) | 0;
 j = Qb(Z | 0, E | 0, j | 0, x | 0) | 0;
 E = Nb(j | 0, x | 0, 21) | 0;
 e = Qb(E | 0, x | 0, W | 0, e | 0) | 0;
 W = Nb(e | 0, x | 0, 21) | 0;
 E = x;
 Z = Mb(W | 0, E | 0, 666643, 0) | 0;
 _ = Qb(Z | 0, x | 0, _ & 2097151 | 0, 0) | 0;
 Z = x;
 X = Mb(W | 0, E | 0, 470296, 0) | 0;
 T = Qb(X | 0, x | 0, T & 2097151 | 0, 0) | 0;
 X = x;
 R = Mb(W | 0, E | 0, 654183, 0) | 0;
 V = Qb(R | 0, x | 0, V & 2097151 | 0, 0) | 0;
 R = x;
 O = Mb(W | 0, E | 0, -997805, -1) | 0;
 Q = Qb(O | 0, x | 0, Q & 2097151 | 0, 0) | 0;
 O = x;
 K = Mb(W | 0, E | 0, 136657, 0) | 0;
 M = Qb(K | 0, x | 0, M & 2097151 | 0, 0) | 0;
 K = x;
 E = Mb(W | 0, E | 0, -683901, -1) | 0;
 I = Qb(E | 0, x | 0, I & 2097151 | 0, 0) | 0;
 E = x;
 W = Nb(_ | 0, Z | 0, 21) | 0;
 W = Qb(T | 0, X | 0, W | 0, x | 0) | 0;
 X = x;
 T = Nb(W | 0, X | 0, 21) | 0;
 T = Qb(V | 0, R | 0, T | 0, x | 0) | 0;
 R = x;
 V = W & 2097151;
 N = Nb(T | 0, R | 0, 21) | 0;
 N = Qb(Q | 0, O | 0, N | 0, x | 0) | 0;
 O = x;
 Q = T & 2097151;
 J = Nb(N | 0, O | 0, 21) | 0;
 J = Qb(M | 0, K | 0, J | 0, x | 0) | 0;
 K = x;
 M = N & 2097151;
 G = Nb(J | 0, K | 0, 21) | 0;
 G = Qb(I | 0, E | 0, G | 0, x | 0) | 0;
 E = x;
 I = J & 2097151;
 B = Nb(G | 0, E | 0, 21) | 0;
 A = Qb(B | 0, x | 0, A & 2097151 | 0, 0) | 0;
 B = x;
 D = G & 2097151;
 u = Nb(A | 0, B | 0, 21) | 0;
 v = Qb(u | 0, x | 0, v & 2097151 | 0, 0) | 0;
 u = x;
 z = A & 2097151;
 p = Nb(v | 0, u | 0, 21) | 0;
 q = Qb(p | 0, x | 0, q & 2097151 | 0, 0) | 0;
 p = x;
 n = Nb(q | 0, p | 0, 21) | 0;
 m = Qb(n | 0, x | 0, m & 2097151 | 0, 0) | 0;
 n = x;
 h = Nb(m | 0, n | 0, 21) | 0;
 j = Qb(h | 0, x | 0, j & 2097151 | 0, 0) | 0;
 h = x;
 l = m & 2097151;
 d = Nb(j | 0, h | 0, 21) | 0;
 e = Qb(d | 0, x | 0, e & 2097151 | 0, 0) | 0;
 d = x;
 g = j & 2097151;
 a[b >> 0] = _;
 aa = Ob(_ | 0, Z | 0, 8) | 0;
 a[$ >> 0] = aa;
 Z = Ob(_ | 0, Z | 0, 16) | 0;
 _ = Pb(V | 0, 0, 5) | 0;
 a[Y >> 0] = _ | Z & 31;
 Y = Ob(W | 0, X | 0, 3) | 0;
 a[b + 3 >> 0] = Y;
 X = Ob(W | 0, X | 0, 11) | 0;
 a[b + 4 >> 0] = X;
 V = Ob(V | 0, 0, 19) | 0;
 X = x;
 W = Pb(Q | 0, 0, 2) | 0;
 a[U >> 0] = W | V;
 R = Ob(T | 0, R | 0, 6) | 0;
 a[S >> 0] = R;
 Q = Ob(Q | 0, 0, 14) | 0;
 S = x;
 R = Pb(M | 0, 0, 7) | 0;
 a[P >> 0] = R | Q;
 P = Ob(N | 0, O | 0, 1) | 0;
 a[b + 8 >> 0] = P;
 O = Ob(N | 0, O | 0, 9) | 0;
 a[b + 9 >> 0] = O;
 M = Ob(M | 0, 0, 17) | 0;
 O = x;
 N = Pb(I | 0, 0, 4) | 0;
 a[L >> 0] = N | M;
 L = Ob(J | 0, K | 0, 4) | 0;
 a[b + 11 >> 0] = L;
 K = Ob(J | 0, K | 0, 12) | 0;
 a[b + 12 >> 0] = K;
 I = Ob(I | 0, 0, 20) | 0;
 K = x;
 J = Pb(D | 0, 0, 1) | 0;
 a[H >> 0] = J | I;
 E = Ob(G | 0, E | 0, 7) | 0;
 a[F >> 0] = E;
 D = Ob(D | 0, 0, 15) | 0;
 F = x;
 E = Pb(z | 0, 0, 6) | 0;
 a[C >> 0] = E | D;
 C = Ob(A | 0, B | 0, 2) | 0;
 a[b + 16 >> 0] = C;
 B = Ob(A | 0, B | 0, 10) | 0;
 a[b + 17 >> 0] = B;
 z = Ob(z | 0, 0, 18) | 0;
 B = x;
 A = Pb(v | 0, u | 0, 3) | 0;
 a[y >> 0] = A | z;
 y = Ob(v | 0, u | 0, 5) | 0;
 a[w >> 0] = y;
 u = Ob(v | 0, u | 0, 13) | 0;
 a[t >> 0] = u;
 a[s >> 0] = q;
 s = Ob(q | 0, p | 0, 8) | 0;
 a[r >> 0] = s;
 p = Ob(q | 0, p | 0, 16) | 0;
 q = Pb(l | 0, 0, 5) | 0;
 a[o >> 0] = q | p & 31;
 o = Ob(m | 0, n | 0, 3) | 0;
 a[b + 24 >> 0] = o;
 n = Ob(m | 0, n | 0, 11) | 0;
 a[b + 25 >> 0] = n;
 l = Ob(l | 0, 0, 19) | 0;
 n = x;
 m = Pb(g | 0, 0, 2) | 0;
 a[k >> 0] = m | l;
 h = Ob(j | 0, h | 0, 6) | 0;
 a[i >> 0] = h;
 g = Ob(g | 0, 0, 14) | 0;
 i = x;
 h = Pb(e | 0, d | 0, 7) | 0;
 a[f >> 0] = h | g;
 f = Ob(e | 0, d | 0, 1) | 0;
 a[b + 29 >> 0] = f;
 f = Ob(e | 0, d | 0, 9) | 0;
 a[b + 30 >> 0] = f;
 b = Nb(e | 0, d | 0, 17) | 0;
 a[c >> 0] = b;
 return;
}

function sa(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0;
 h = Nb(0, c[b >> 2] | 0, 32) | 0;
 n = x;
 w = Nb(0, c[d >> 2] | 0, 32) | 0;
 n = Mb(w | 0, x | 0, h | 0, n | 0) | 0;
 h = a;
 c[h >> 2] = n;
 c[h + 4 >> 2] = x;
 h = Nb(0, c[b >> 2] | 0, 32) | 0;
 n = x;
 w = d + 8 | 0;
 s = Nb(0, c[w >> 2] | 0, 32) | 0;
 n = Mb(s | 0, x | 0, h | 0, n | 0) | 0;
 h = x;
 s = b + 8 | 0;
 r = Nb(0, c[s >> 2] | 0, 32) | 0;
 p = x;
 v = Nb(0, c[d >> 2] | 0, 32) | 0;
 p = Mb(v | 0, x | 0, r | 0, p | 0) | 0;
 h = Qb(p | 0, x | 0, n | 0, h | 0) | 0;
 n = a + 8 | 0;
 c[n >> 2] = h;
 c[n + 4 >> 2] = x;
 n = Nb(0, c[s >> 2] | 0, 31) | 0;
 h = x;
 p = Nb(0, c[w >> 2] | 0, 32) | 0;
 h = Mb(p | 0, x | 0, n | 0, h | 0) | 0;
 n = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 r = x;
 v = d + 16 | 0;
 l = Nb(0, c[v >> 2] | 0, 32) | 0;
 r = Mb(l | 0, x | 0, p | 0, r | 0) | 0;
 n = Qb(r | 0, x | 0, h | 0, n | 0) | 0;
 h = x;
 r = b + 16 | 0;
 p = Nb(0, c[r >> 2] | 0, 32) | 0;
 l = x;
 u = Nb(0, c[d >> 2] | 0, 32) | 0;
 l = Mb(u | 0, x | 0, p | 0, l | 0) | 0;
 l = Qb(n | 0, h | 0, l | 0, x | 0) | 0;
 h = a + 16 | 0;
 c[h >> 2] = l;
 c[h + 4 >> 2] = x;
 h = Nb(0, c[s >> 2] | 0, 32) | 0;
 l = x;
 n = Nb(0, c[v >> 2] | 0, 32) | 0;
 l = Mb(n | 0, x | 0, h | 0, l | 0) | 0;
 h = x;
 n = Nb(0, c[r >> 2] | 0, 32) | 0;
 p = x;
 u = Nb(0, c[w >> 2] | 0, 32) | 0;
 p = Mb(u | 0, x | 0, n | 0, p | 0) | 0;
 h = Qb(p | 0, x | 0, l | 0, h | 0) | 0;
 l = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 n = x;
 u = d + 24 | 0;
 g = Nb(0, c[u >> 2] | 0, 32) | 0;
 n = Mb(g | 0, x | 0, p | 0, n | 0) | 0;
 n = Qb(h | 0, l | 0, n | 0, x | 0) | 0;
 l = x;
 h = b + 24 | 0;
 p = Nb(0, c[h >> 2] | 0, 32) | 0;
 g = x;
 j = Nb(0, c[d >> 2] | 0, 32) | 0;
 g = Mb(j | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(n | 0, l | 0, g | 0, x | 0) | 0;
 l = a + 24 | 0;
 c[l >> 2] = g;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[r >> 2] | 0, 32) | 0;
 g = x;
 n = Nb(0, c[v >> 2] | 0, 32) | 0;
 g = Mb(n | 0, x | 0, l | 0, g | 0) | 0;
 l = x;
 n = Nb(0, c[s >> 2] | 0, 32) | 0;
 p = x;
 j = Nb(0, c[u >> 2] | 0, 32) | 0;
 p = Mb(j | 0, x | 0, n | 0, p | 0) | 0;
 n = x;
 j = Nb(0, c[h >> 2] | 0, 32) | 0;
 q = x;
 o = Nb(0, c[w >> 2] | 0, 32) | 0;
 q = Mb(o | 0, x | 0, j | 0, q | 0) | 0;
 n = Qb(q | 0, x | 0, p | 0, n | 0) | 0;
 n = Pb(n | 0, x | 0, 1) | 0;
 l = Qb(n | 0, x | 0, g | 0, l | 0) | 0;
 g = x;
 n = Nb(0, c[b >> 2] | 0, 32) | 0;
 p = x;
 q = d + 32 | 0;
 j = Nb(0, c[q >> 2] | 0, 32) | 0;
 p = Mb(j | 0, x | 0, n | 0, p | 0) | 0;
 p = Qb(l | 0, g | 0, p | 0, x | 0) | 0;
 g = x;
 l = b + 32 | 0;
 n = Nb(0, c[l >> 2] | 0, 32) | 0;
 j = x;
 o = Nb(0, c[d >> 2] | 0, 32) | 0;
 j = Mb(o | 0, x | 0, n | 0, j | 0) | 0;
 j = Qb(p | 0, g | 0, j | 0, x | 0) | 0;
 g = a + 32 | 0;
 c[g >> 2] = j;
 c[g + 4 >> 2] = x;
 g = Nb(0, c[r >> 2] | 0, 32) | 0;
 j = x;
 p = Nb(0, c[u >> 2] | 0, 32) | 0;
 j = Mb(p | 0, x | 0, g | 0, j | 0) | 0;
 g = x;
 p = Nb(0, c[h >> 2] | 0, 32) | 0;
 n = x;
 o = Nb(0, c[v >> 2] | 0, 32) | 0;
 n = Mb(o | 0, x | 0, p | 0, n | 0) | 0;
 g = Qb(n | 0, x | 0, j | 0, g | 0) | 0;
 j = x;
 n = Nb(0, c[s >> 2] | 0, 32) | 0;
 p = x;
 o = Nb(0, c[q >> 2] | 0, 32) | 0;
 p = Mb(o | 0, x | 0, n | 0, p | 0) | 0;
 p = Qb(g | 0, j | 0, p | 0, x | 0) | 0;
 j = x;
 g = Nb(0, c[l >> 2] | 0, 32) | 0;
 n = x;
 o = Nb(0, c[w >> 2] | 0, 32) | 0;
 n = Mb(o | 0, x | 0, g | 0, n | 0) | 0;
 n = Qb(p | 0, j | 0, n | 0, x | 0) | 0;
 j = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 g = x;
 o = d + 40 | 0;
 t = Nb(0, c[o >> 2] | 0, 32) | 0;
 g = Mb(t | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(n | 0, j | 0, g | 0, x | 0) | 0;
 j = x;
 n = b + 40 | 0;
 p = Nb(0, c[n >> 2] | 0, 32) | 0;
 t = x;
 k = Nb(0, c[d >> 2] | 0, 32) | 0;
 t = Mb(k | 0, x | 0, p | 0, t | 0) | 0;
 t = Qb(g | 0, j | 0, t | 0, x | 0) | 0;
 j = a + 40 | 0;
 c[j >> 2] = t;
 c[j + 4 >> 2] = x;
 j = Nb(0, c[h >> 2] | 0, 32) | 0;
 t = x;
 g = Nb(0, c[u >> 2] | 0, 32) | 0;
 t = Mb(g | 0, x | 0, j | 0, t | 0) | 0;
 j = x;
 g = Nb(0, c[s >> 2] | 0, 32) | 0;
 p = x;
 k = Nb(0, c[o >> 2] | 0, 32) | 0;
 p = Mb(k | 0, x | 0, g | 0, p | 0) | 0;
 j = Qb(p | 0, x | 0, t | 0, j | 0) | 0;
 t = x;
 p = Nb(0, c[n >> 2] | 0, 32) | 0;
 g = x;
 k = Nb(0, c[w >> 2] | 0, 32) | 0;
 g = Mb(k | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(j | 0, t | 0, g | 0, x | 0) | 0;
 g = Pb(g | 0, x | 0, 1) | 0;
 t = x;
 j = Nb(0, c[r >> 2] | 0, 32) | 0;
 p = x;
 k = Nb(0, c[q >> 2] | 0, 32) | 0;
 p = Mb(k | 0, x | 0, j | 0, p | 0) | 0;
 p = Qb(g | 0, t | 0, p | 0, x | 0) | 0;
 t = x;
 g = Nb(0, c[l >> 2] | 0, 32) | 0;
 j = x;
 k = Nb(0, c[v >> 2] | 0, 32) | 0;
 j = Mb(k | 0, x | 0, g | 0, j | 0) | 0;
 j = Qb(p | 0, t | 0, j | 0, x | 0) | 0;
 t = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 g = x;
 k = d + 48 | 0;
 y = Nb(0, c[k >> 2] | 0, 32) | 0;
 g = Mb(y | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(j | 0, t | 0, g | 0, x | 0) | 0;
 t = x;
 j = b + 48 | 0;
 p = Nb(0, c[j >> 2] | 0, 32) | 0;
 y = x;
 m = Nb(0, c[d >> 2] | 0, 32) | 0;
 y = Mb(m | 0, x | 0, p | 0, y | 0) | 0;
 y = Qb(g | 0, t | 0, y | 0, x | 0) | 0;
 t = a + 48 | 0;
 c[t >> 2] = y;
 c[t + 4 >> 2] = x;
 t = Nb(0, c[h >> 2] | 0, 32) | 0;
 y = x;
 g = Nb(0, c[q >> 2] | 0, 32) | 0;
 y = Mb(g | 0, x | 0, t | 0, y | 0) | 0;
 t = x;
 g = Nb(0, c[l >> 2] | 0, 32) | 0;
 p = x;
 m = Nb(0, c[u >> 2] | 0, 32) | 0;
 p = Mb(m | 0, x | 0, g | 0, p | 0) | 0;
 t = Qb(p | 0, x | 0, y | 0, t | 0) | 0;
 y = x;
 p = Nb(0, c[r >> 2] | 0, 32) | 0;
 g = x;
 m = Nb(0, c[o >> 2] | 0, 32) | 0;
 g = Mb(m | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(t | 0, y | 0, g | 0, x | 0) | 0;
 y = x;
 t = Nb(0, c[n >> 2] | 0, 32) | 0;
 p = x;
 m = Nb(0, c[v >> 2] | 0, 32) | 0;
 p = Mb(m | 0, x | 0, t | 0, p | 0) | 0;
 p = Qb(g | 0, y | 0, p | 0, x | 0) | 0;
 y = x;
 g = Nb(0, c[s >> 2] | 0, 32) | 0;
 t = x;
 m = Nb(0, c[k >> 2] | 0, 32) | 0;
 t = Mb(m | 0, x | 0, g | 0, t | 0) | 0;
 t = Qb(p | 0, y | 0, t | 0, x | 0) | 0;
 y = x;
 p = Nb(0, c[j >> 2] | 0, 32) | 0;
 g = x;
 m = Nb(0, c[w >> 2] | 0, 32) | 0;
 g = Mb(m | 0, x | 0, p | 0, g | 0) | 0;
 g = Qb(t | 0, y | 0, g | 0, x | 0) | 0;
 y = x;
 t = Nb(0, c[b >> 2] | 0, 32) | 0;
 p = x;
 m = d + 56 | 0;
 z = Nb(0, c[m >> 2] | 0, 32) | 0;
 p = Mb(z | 0, x | 0, t | 0, p | 0) | 0;
 p = Qb(g | 0, y | 0, p | 0, x | 0) | 0;
 y = x;
 g = b + 56 | 0;
 t = Nb(0, c[g >> 2] | 0, 32) | 0;
 z = x;
 i = Nb(0, c[d >> 2] | 0, 32) | 0;
 z = Mb(i | 0, x | 0, t | 0, z | 0) | 0;
 z = Qb(p | 0, y | 0, z | 0, x | 0) | 0;
 y = a + 56 | 0;
 c[y >> 2] = z;
 c[y + 4 >> 2] = x;
 y = Nb(0, c[l >> 2] | 0, 32) | 0;
 z = x;
 p = Nb(0, c[q >> 2] | 0, 32) | 0;
 z = Mb(p | 0, x | 0, y | 0, z | 0) | 0;
 y = x;
 p = Nb(0, c[h >> 2] | 0, 32) | 0;
 t = x;
 i = Nb(0, c[o >> 2] | 0, 32) | 0;
 t = Mb(i | 0, x | 0, p | 0, t | 0) | 0;
 p = x;
 i = Nb(0, c[n >> 2] | 0, 32) | 0;
 f = x;
 e = Nb(0, c[u >> 2] | 0, 32) | 0;
 f = Mb(e | 0, x | 0, i | 0, f | 0) | 0;
 p = Qb(f | 0, x | 0, t | 0, p | 0) | 0;
 t = x;
 f = Nb(0, c[s >> 2] | 0, 32) | 0;
 i = x;
 e = Nb(0, c[m >> 2] | 0, 32) | 0;
 i = Mb(e | 0, x | 0, f | 0, i | 0) | 0;
 i = Qb(p | 0, t | 0, i | 0, x | 0) | 0;
 t = x;
 p = Nb(0, c[g >> 2] | 0, 32) | 0;
 f = x;
 e = Nb(0, c[w >> 2] | 0, 32) | 0;
 f = Mb(e | 0, x | 0, p | 0, f | 0) | 0;
 f = Qb(i | 0, t | 0, f | 0, x | 0) | 0;
 f = Pb(f | 0, x | 0, 1) | 0;
 y = Qb(f | 0, x | 0, z | 0, y | 0) | 0;
 z = x;
 f = Nb(0, c[r >> 2] | 0, 32) | 0;
 t = x;
 i = Nb(0, c[k >> 2] | 0, 32) | 0;
 t = Mb(i | 0, x | 0, f | 0, t | 0) | 0;
 t = Qb(y | 0, z | 0, t | 0, x | 0) | 0;
 z = x;
 y = Nb(0, c[j >> 2] | 0, 32) | 0;
 f = x;
 i = Nb(0, c[v >> 2] | 0, 32) | 0;
 f = Mb(i | 0, x | 0, y | 0, f | 0) | 0;
 f = Qb(t | 0, z | 0, f | 0, x | 0) | 0;
 z = x;
 t = Nb(0, c[b >> 2] | 0, 32) | 0;
 y = x;
 i = d + 64 | 0;
 p = Nb(0, c[i >> 2] | 0, 32) | 0;
 y = Mb(p | 0, x | 0, t | 0, y | 0) | 0;
 y = Qb(f | 0, z | 0, y | 0, x | 0) | 0;
 z = x;
 f = b + 64 | 0;
 t = Nb(0, c[f >> 2] | 0, 32) | 0;
 p = x;
 e = Nb(0, c[d >> 2] | 0, 32) | 0;
 p = Mb(e | 0, x | 0, t | 0, p | 0) | 0;
 p = Qb(y | 0, z | 0, p | 0, x | 0) | 0;
 z = a + 64 | 0;
 c[z >> 2] = p;
 c[z + 4 >> 2] = x;
 z = Nb(0, c[l >> 2] | 0, 32) | 0;
 p = x;
 y = Nb(0, c[o >> 2] | 0, 32) | 0;
 p = Mb(y | 0, x | 0, z | 0, p | 0) | 0;
 z = x;
 y = Nb(0, c[n >> 2] | 0, 32) | 0;
 t = x;
 e = Nb(0, c[q >> 2] | 0, 32) | 0;
 t = Mb(e | 0, x | 0, y | 0, t | 0) | 0;
 z = Qb(t | 0, x | 0, p | 0, z | 0) | 0;
 p = x;
 t = Nb(0, c[h >> 2] | 0, 32) | 0;
 y = x;
 e = Nb(0, c[k >> 2] | 0, 32) | 0;
 y = Mb(e | 0, x | 0, t | 0, y | 0) | 0;
 y = Qb(z | 0, p | 0, y | 0, x | 0) | 0;
 p = x;
 z = Nb(0, c[j >> 2] | 0, 32) | 0;
 t = x;
 e = Nb(0, c[u >> 2] | 0, 32) | 0;
 t = Mb(e | 0, x | 0, z | 0, t | 0) | 0;
 t = Qb(y | 0, p | 0, t | 0, x | 0) | 0;
 p = x;
 y = Nb(0, c[r >> 2] | 0, 32) | 0;
 z = x;
 e = Nb(0, c[m >> 2] | 0, 32) | 0;
 z = Mb(e | 0, x | 0, y | 0, z | 0) | 0;
 z = Qb(t | 0, p | 0, z | 0, x | 0) | 0;
 p = x;
 t = Nb(0, c[g >> 2] | 0, 32) | 0;
 y = x;
 e = Nb(0, c[v >> 2] | 0, 32) | 0;
 y = Mb(e | 0, x | 0, t | 0, y | 0) | 0;
 y = Qb(z | 0, p | 0, y | 0, x | 0) | 0;
 p = x;
 z = Nb(0, c[s >> 2] | 0, 32) | 0;
 t = x;
 e = Nb(0, c[i >> 2] | 0, 32) | 0;
 t = Mb(e | 0, x | 0, z | 0, t | 0) | 0;
 t = Qb(y | 0, p | 0, t | 0, x | 0) | 0;
 p = x;
 y = Nb(0, c[f >> 2] | 0, 32) | 0;
 z = x;
 e = Nb(0, c[w >> 2] | 0, 32) | 0;
 z = Mb(e | 0, x | 0, y | 0, z | 0) | 0;
 z = Qb(t | 0, p | 0, z | 0, x | 0) | 0;
 p = x;
 t = Nb(0, c[b >> 2] | 0, 32) | 0;
 y = x;
 e = d + 72 | 0;
 A = Nb(0, c[e >> 2] | 0, 32) | 0;
 y = Mb(A | 0, x | 0, t | 0, y | 0) | 0;
 y = Qb(z | 0, p | 0, y | 0, x | 0) | 0;
 p = x;
 b = b + 72 | 0;
 z = Nb(0, c[b >> 2] | 0, 32) | 0;
 t = x;
 d = Nb(0, c[d >> 2] | 0, 32) | 0;
 t = Mb(d | 0, x | 0, z | 0, t | 0) | 0;
 t = Qb(y | 0, p | 0, t | 0, x | 0) | 0;
 d = a + 72 | 0;
 c[d >> 2] = t;
 c[d + 4 >> 2] = x;
 d = Nb(0, c[n >> 2] | 0, 32) | 0;
 t = x;
 p = Nb(0, c[o >> 2] | 0, 32) | 0;
 t = Mb(p | 0, x | 0, d | 0, t | 0) | 0;
 d = x;
 p = Nb(0, c[h >> 2] | 0, 32) | 0;
 y = x;
 z = Nb(0, c[m >> 2] | 0, 32) | 0;
 y = Mb(z | 0, x | 0, p | 0, y | 0) | 0;
 d = Qb(y | 0, x | 0, t | 0, d | 0) | 0;
 t = x;
 y = Nb(0, c[g >> 2] | 0, 32) | 0;
 p = x;
 z = Nb(0, c[u >> 2] | 0, 32) | 0;
 p = Mb(z | 0, x | 0, y | 0, p | 0) | 0;
 p = Qb(d | 0, t | 0, p | 0, x | 0) | 0;
 t = x;
 d = Nb(0, c[s >> 2] | 0, 32) | 0;
 s = x;
 y = Nb(0, c[e >> 2] | 0, 32) | 0;
 s = Mb(y | 0, x | 0, d | 0, s | 0) | 0;
 s = Qb(p | 0, t | 0, s | 0, x | 0) | 0;
 t = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 d = x;
 w = Nb(0, c[w >> 2] | 0, 32) | 0;
 d = Mb(w | 0, x | 0, p | 0, d | 0) | 0;
 d = Qb(s | 0, t | 0, d | 0, x | 0) | 0;
 d = Pb(d | 0, x | 0, 1) | 0;
 t = x;
 s = Nb(0, c[l >> 2] | 0, 32) | 0;
 p = x;
 w = Nb(0, c[k >> 2] | 0, 32) | 0;
 p = Mb(w | 0, x | 0, s | 0, p | 0) | 0;
 p = Qb(d | 0, t | 0, p | 0, x | 0) | 0;
 t = x;
 d = Nb(0, c[j >> 2] | 0, 32) | 0;
 s = x;
 w = Nb(0, c[q >> 2] | 0, 32) | 0;
 s = Mb(w | 0, x | 0, d | 0, s | 0) | 0;
 s = Qb(p | 0, t | 0, s | 0, x | 0) | 0;
 t = x;
 p = Nb(0, c[r >> 2] | 0, 32) | 0;
 d = x;
 w = Nb(0, c[i >> 2] | 0, 32) | 0;
 d = Mb(w | 0, x | 0, p | 0, d | 0) | 0;
 d = Qb(s | 0, t | 0, d | 0, x | 0) | 0;
 t = x;
 s = Nb(0, c[f >> 2] | 0, 32) | 0;
 p = x;
 w = Nb(0, c[v >> 2] | 0, 32) | 0;
 p = Mb(w | 0, x | 0, s | 0, p | 0) | 0;
 p = Qb(d | 0, t | 0, p | 0, x | 0) | 0;
 t = a + 80 | 0;
 c[t >> 2] = p;
 c[t + 4 >> 2] = x;
 t = Nb(0, c[n >> 2] | 0, 32) | 0;
 p = x;
 d = Nb(0, c[k >> 2] | 0, 32) | 0;
 p = Mb(d | 0, x | 0, t | 0, p | 0) | 0;
 t = x;
 d = Nb(0, c[j >> 2] | 0, 32) | 0;
 s = x;
 w = Nb(0, c[o >> 2] | 0, 32) | 0;
 s = Mb(w | 0, x | 0, d | 0, s | 0) | 0;
 t = Qb(s | 0, x | 0, p | 0, t | 0) | 0;
 p = x;
 s = Nb(0, c[l >> 2] | 0, 32) | 0;
 d = x;
 w = Nb(0, c[m >> 2] | 0, 32) | 0;
 d = Mb(w | 0, x | 0, s | 0, d | 0) | 0;
 d = Qb(t | 0, p | 0, d | 0, x | 0) | 0;
 p = x;
 t = Nb(0, c[g >> 2] | 0, 32) | 0;
 s = x;
 w = Nb(0, c[q >> 2] | 0, 32) | 0;
 s = Mb(w | 0, x | 0, t | 0, s | 0) | 0;
 s = Qb(d | 0, p | 0, s | 0, x | 0) | 0;
 p = x;
 d = Nb(0, c[h >> 2] | 0, 32) | 0;
 t = x;
 w = Nb(0, c[i >> 2] | 0, 32) | 0;
 t = Mb(w | 0, x | 0, d | 0, t | 0) | 0;
 t = Qb(s | 0, p | 0, t | 0, x | 0) | 0;
 p = x;
 s = Nb(0, c[f >> 2] | 0, 32) | 0;
 d = x;
 w = Nb(0, c[u >> 2] | 0, 32) | 0;
 d = Mb(w | 0, x | 0, s | 0, d | 0) | 0;
 d = Qb(t | 0, p | 0, d | 0, x | 0) | 0;
 p = x;
 r = Nb(0, c[r >> 2] | 0, 32) | 0;
 t = x;
 s = Nb(0, c[e >> 2] | 0, 32) | 0;
 t = Mb(s | 0, x | 0, r | 0, t | 0) | 0;
 t = Qb(d | 0, p | 0, t | 0, x | 0) | 0;
 p = x;
 d = Nb(0, c[b >> 2] | 0, 32) | 0;
 r = x;
 v = Nb(0, c[v >> 2] | 0, 32) | 0;
 r = Mb(v | 0, x | 0, d | 0, r | 0) | 0;
 r = Qb(t | 0, p | 0, r | 0, x | 0) | 0;
 p = a + 88 | 0;
 c[p >> 2] = r;
 c[p + 4 >> 2] = x;
 p = Nb(0, c[j >> 2] | 0, 32) | 0;
 r = x;
 t = Nb(0, c[k >> 2] | 0, 32) | 0;
 r = Mb(t | 0, x | 0, p | 0, r | 0) | 0;
 p = x;
 t = Nb(0, c[n >> 2] | 0, 32) | 0;
 d = x;
 v = Nb(0, c[m >> 2] | 0, 32) | 0;
 d = Mb(v | 0, x | 0, t | 0, d | 0) | 0;
 t = x;
 v = Nb(0, c[g >> 2] | 0, 32) | 0;
 s = x;
 w = Nb(0, c[o >> 2] | 0, 32) | 0;
 s = Mb(w | 0, x | 0, v | 0, s | 0) | 0;
 t = Qb(s | 0, x | 0, d | 0, t | 0) | 0;
 d = x;
 h = Nb(0, c[h >> 2] | 0, 32) | 0;
 s = x;
 v = Nb(0, c[e >> 2] | 0, 32) | 0;
 s = Mb(v | 0, x | 0, h | 0, s | 0) | 0;
 s = Qb(t | 0, d | 0, s | 0, x | 0) | 0;
 d = x;
 t = Nb(0, c[b >> 2] | 0, 32) | 0;
 h = x;
 u = Nb(0, c[u >> 2] | 0, 32) | 0;
 h = Mb(u | 0, x | 0, t | 0, h | 0) | 0;
 h = Qb(s | 0, d | 0, h | 0, x | 0) | 0;
 h = Pb(h | 0, x | 0, 1) | 0;
 p = Qb(h | 0, x | 0, r | 0, p | 0) | 0;
 r = x;
 h = Nb(0, c[l >> 2] | 0, 32) | 0;
 d = x;
 s = Nb(0, c[i >> 2] | 0, 32) | 0;
 d = Mb(s | 0, x | 0, h | 0, d | 0) | 0;
 d = Qb(p | 0, r | 0, d | 0, x | 0) | 0;
 r = x;
 p = Nb(0, c[f >> 2] | 0, 32) | 0;
 h = x;
 s = Nb(0, c[q >> 2] | 0, 32) | 0;
 h = Mb(s | 0, x | 0, p | 0, h | 0) | 0;
 h = Qb(d | 0, r | 0, h | 0, x | 0) | 0;
 r = a + 96 | 0;
 c[r >> 2] = h;
 c[r + 4 >> 2] = x;
 r = Nb(0, c[j >> 2] | 0, 32) | 0;
 h = x;
 d = Nb(0, c[m >> 2] | 0, 32) | 0;
 h = Mb(d | 0, x | 0, r | 0, h | 0) | 0;
 r = x;
 d = Nb(0, c[g >> 2] | 0, 32) | 0;
 p = x;
 s = Nb(0, c[k >> 2] | 0, 32) | 0;
 p = Mb(s | 0, x | 0, d | 0, p | 0) | 0;
 r = Qb(p | 0, x | 0, h | 0, r | 0) | 0;
 h = x;
 p = Nb(0, c[n >> 2] | 0, 32) | 0;
 d = x;
 s = Nb(0, c[i >> 2] | 0, 32) | 0;
 d = Mb(s | 0, x | 0, p | 0, d | 0) | 0;
 d = Qb(r | 0, h | 0, d | 0, x | 0) | 0;
 h = x;
 r = Nb(0, c[f >> 2] | 0, 32) | 0;
 p = x;
 s = Nb(0, c[o >> 2] | 0, 32) | 0;
 p = Mb(s | 0, x | 0, r | 0, p | 0) | 0;
 p = Qb(d | 0, h | 0, p | 0, x | 0) | 0;
 h = x;
 l = Nb(0, c[l >> 2] | 0, 32) | 0;
 d = x;
 r = Nb(0, c[e >> 2] | 0, 32) | 0;
 d = Mb(r | 0, x | 0, l | 0, d | 0) | 0;
 d = Qb(p | 0, h | 0, d | 0, x | 0) | 0;
 h = x;
 p = Nb(0, c[b >> 2] | 0, 32) | 0;
 l = x;
 q = Nb(0, c[q >> 2] | 0, 32) | 0;
 l = Mb(q | 0, x | 0, p | 0, l | 0) | 0;
 l = Qb(d | 0, h | 0, l | 0, x | 0) | 0;
 h = a + 104 | 0;
 c[h >> 2] = l;
 c[h + 4 >> 2] = x;
 h = Nb(0, c[g >> 2] | 0, 32) | 0;
 l = x;
 d = Nb(0, c[m >> 2] | 0, 32) | 0;
 l = Mb(d | 0, x | 0, h | 0, l | 0) | 0;
 h = x;
 d = Nb(0, c[n >> 2] | 0, 32) | 0;
 n = x;
 p = Nb(0, c[e >> 2] | 0, 32) | 0;
 n = Mb(p | 0, x | 0, d | 0, n | 0) | 0;
 h = Qb(n | 0, x | 0, l | 0, h | 0) | 0;
 l = x;
 n = Nb(0, c[b >> 2] | 0, 32) | 0;
 d = x;
 o = Nb(0, c[o >> 2] | 0, 32) | 0;
 d = Mb(o | 0, x | 0, n | 0, d | 0) | 0;
 d = Qb(h | 0, l | 0, d | 0, x | 0) | 0;
 d = Pb(d | 0, x | 0, 1) | 0;
 l = x;
 h = Nb(0, c[j >> 2] | 0, 32) | 0;
 n = x;
 o = Nb(0, c[i >> 2] | 0, 32) | 0;
 n = Mb(o | 0, x | 0, h | 0, n | 0) | 0;
 n = Qb(d | 0, l | 0, n | 0, x | 0) | 0;
 l = x;
 d = Nb(0, c[f >> 2] | 0, 32) | 0;
 h = x;
 o = Nb(0, c[k >> 2] | 0, 32) | 0;
 h = Mb(o | 0, x | 0, d | 0, h | 0) | 0;
 h = Qb(n | 0, l | 0, h | 0, x | 0) | 0;
 l = a + 112 | 0;
 c[l >> 2] = h;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[g >> 2] | 0, 32) | 0;
 h = x;
 n = Nb(0, c[i >> 2] | 0, 32) | 0;
 h = Mb(n | 0, x | 0, l | 0, h | 0) | 0;
 l = x;
 n = Nb(0, c[f >> 2] | 0, 32) | 0;
 d = x;
 o = Nb(0, c[m >> 2] | 0, 32) | 0;
 d = Mb(o | 0, x | 0, n | 0, d | 0) | 0;
 l = Qb(d | 0, x | 0, h | 0, l | 0) | 0;
 h = x;
 d = Nb(0, c[j >> 2] | 0, 32) | 0;
 j = x;
 n = Nb(0, c[e >> 2] | 0, 32) | 0;
 j = Mb(n | 0, x | 0, d | 0, j | 0) | 0;
 j = Qb(l | 0, h | 0, j | 0, x | 0) | 0;
 h = x;
 l = Nb(0, c[b >> 2] | 0, 32) | 0;
 d = x;
 k = Nb(0, c[k >> 2] | 0, 32) | 0;
 d = Mb(k | 0, x | 0, l | 0, d | 0) | 0;
 d = Qb(j | 0, h | 0, d | 0, x | 0) | 0;
 h = a + 120 | 0;
 c[h >> 2] = d;
 c[h + 4 >> 2] = x;
 h = Nb(0, c[f >> 2] | 0, 32) | 0;
 d = x;
 j = Nb(0, c[i >> 2] | 0, 32) | 0;
 d = Mb(j | 0, x | 0, h | 0, d | 0) | 0;
 h = x;
 g = Nb(0, c[g >> 2] | 0, 32) | 0;
 j = x;
 l = Nb(0, c[e >> 2] | 0, 32) | 0;
 j = Mb(l | 0, x | 0, g | 0, j | 0) | 0;
 g = x;
 l = Nb(0, c[b >> 2] | 0, 32) | 0;
 k = x;
 m = Nb(0, c[m >> 2] | 0, 32) | 0;
 k = Mb(m | 0, x | 0, l | 0, k | 0) | 0;
 g = Qb(k | 0, x | 0, j | 0, g | 0) | 0;
 g = Pb(g | 0, x | 0, 1) | 0;
 h = Qb(g | 0, x | 0, d | 0, h | 0) | 0;
 d = a + 128 | 0;
 c[d >> 2] = h;
 c[d + 4 >> 2] = x;
 f = Nb(0, c[f >> 2] | 0, 32) | 0;
 d = x;
 h = Nb(0, c[e >> 2] | 0, 32) | 0;
 d = Mb(h | 0, x | 0, f | 0, d | 0) | 0;
 f = x;
 h = Nb(0, c[b >> 2] | 0, 32) | 0;
 g = x;
 i = Nb(0, c[i >> 2] | 0, 32) | 0;
 g = Mb(i | 0, x | 0, h | 0, g | 0) | 0;
 f = Qb(g | 0, x | 0, d | 0, f | 0) | 0;
 d = a + 136 | 0;
 c[d >> 2] = f;
 c[d + 4 >> 2] = x;
 d = Nb(0, c[b >> 2] | 0, 31) | 0;
 b = x;
 e = Nb(0, c[e >> 2] | 0, 32) | 0;
 b = Mb(e | 0, x | 0, d | 0, b | 0) | 0;
 d = a + 144 | 0;
 c[d >> 2] = b;
 c[d + 4 >> 2] = x;
 return;
}

function Pa(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0, La = 0, Ma = 0, Na = 0, Oa = 0, Pa = 0, Qa = 0, Ra = 0, Sa = 0, Ta = 0, Ua = 0, Va = 0, Wa = 0, Xa = 0, Ya = 0, Za = 0, _a = 0, $a = 0, ab = 0, bb = 0, cb = 0, db = 0, eb = 0, fb = 0, gb = 0, hb = 0, ib = 0, jb = 0, kb = 0, lb = 0, mb = 0, nb = 0, ob = 0, pb = 0, qb = 0, rb = 0, sb = 0, tb = 0, ub = 0, vb = 0, wb = 0, xb = 0, yb = 0, zb = 0, Ab = 0, Bb = 0, Cb = 0, Db = 0, Eb = 0, Fb = 0, Gb = 0, Hb = 0, Ib = 0, Jb = 0, Kb = 0, Lb = 0, Pb = 0, Sb = 0, Tb = 0, Ub = 0, Vb = 0, Wb = 0, Xb = 0, Yb = 0, Zb = 0, _b = 0, $b = 0, ac = 0, bc = 0, cc = 0, dc = 0, ec = 0, fc = 0, gc = 0, hc = 0, ic = 0, jc = 0, kc = 0, lc = 0, mc = 0, nc = 0, oc = 0, pc = 0, qc = 0, rc = 0, sc = 0, tc = 0, uc = 0, vc = 0, wc = 0, xc = 0, yc = 0, zc = 0, Ac = 0, Bc = 0, Cc = 0, Dc = 0, Ec = 0, Fc = 0, Gc = 0, Hc = 0, Ic = 0, Jc = 0, Kc = 0, Lc = 0, Mc = 0, Nc = 0, Oc = 0, Pc = 0, Qc = 0, Rc = 0, Sc = 0, Tc = 0, Uc = 0, Vc = 0, Wc = 0, Xc = 0;
 r = c[b >> 2] | 0;
 t = c[b + 4 >> 2] | 0;
 k = c[b + 8 >> 2] | 0;
 Yb = c[b + 12 >> 2] | 0;
 g = c[b + 16 >> 2] | 0;
 Aa = c[b + 20 >> 2] | 0;
 h = c[b + 24 >> 2] | 0;
 Bb = c[b + 28 >> 2] | 0;
 fa = c[b + 32 >> 2] | 0;
 ha = c[b + 36 >> 2] | 0;
 I = c[d >> 2] | 0;
 K = c[d + 4 >> 2] | 0;
 G = c[d + 8 >> 2] | 0;
 E = c[d + 12 >> 2] | 0;
 C = c[d + 16 >> 2] | 0;
 A = c[d + 20 >> 2] | 0;
 y = c[d + 24 >> 2] | 0;
 v = c[d + 28 >> 2] | 0;
 j = c[d + 32 >> 2] | 0;
 u = c[d + 36 >> 2] | 0;
 Tc = K * 19 | 0;
 ic = G * 19 | 0;
 sb = E * 19 | 0;
 Ia = C * 19 | 0;
 oc = A * 19 | 0;
 Fb = y * 19 | 0;
 Ua = v * 19 | 0;
 Xc = j * 19 | 0;
 Vc = u * 19 | 0;
 b = t << 1;
 i = Yb << 1;
 f = Aa << 1;
 e = Bb << 1;
 N = ha << 1;
 s = ((r | 0) < 0) << 31 >> 31;
 J = ((I | 0) < 0) << 31 >> 31;
 Rc = Mb(I | 0, J | 0, r | 0, s | 0) | 0;
 Qc = x;
 L = ((K | 0) < 0) << 31 >> 31;
 Bc = Mb(K | 0, L | 0, r | 0, s | 0) | 0;
 Ac = x;
 H = ((G | 0) < 0) << 31 >> 31;
 vb = Mb(G | 0, H | 0, r | 0, s | 0) | 0;
 ub = x;
 F = ((E | 0) < 0) << 31 >> 31;
 La = Mb(E | 0, F | 0, r | 0, s | 0) | 0;
 Ka = x;
 D = ((C | 0) < 0) << 31 >> 31;
 rc = Mb(C | 0, D | 0, r | 0, s | 0) | 0;
 qc = x;
 B = ((A | 0) < 0) << 31 >> 31;
 Ib = Mb(A | 0, B | 0, r | 0, s | 0) | 0;
 Hb = x;
 z = ((y | 0) < 0) << 31 >> 31;
 Xa = Mb(y | 0, z | 0, r | 0, s | 0) | 0;
 Wa = x;
 w = ((v | 0) < 0) << 31 >> 31;
 ka = Mb(v | 0, w | 0, r | 0, s | 0) | 0;
 ja = x;
 Uc = ((j | 0) < 0) << 31 >> 31;
 Q = Mb(j | 0, Uc | 0, r | 0, s | 0) | 0;
 P = x;
 s = Mb(u | 0, ((u | 0) < 0) << 31 >> 31 | 0, r | 0, s | 0) | 0;
 r = x;
 u = ((t | 0) < 0) << 31 >> 31;
 kc = Mb(I | 0, J | 0, t | 0, u | 0) | 0;
 lc = x;
 l = ((b | 0) < 0) << 31 >> 31;
 zb = Mb(K | 0, L | 0, b | 0, l | 0) | 0;
 yb = x;
 Na = Mb(G | 0, H | 0, t | 0, u | 0) | 0;
 Ma = x;
 tc = Mb(E | 0, F | 0, b | 0, l | 0) | 0;
 sc = x;
 Kb = Mb(C | 0, D | 0, t | 0, u | 0) | 0;
 Jb = x;
 Za = Mb(A | 0, B | 0, b | 0, l | 0) | 0;
 Ya = x;
 ma = Mb(y | 0, z | 0, t | 0, u | 0) | 0;
 la = x;
 S = Mb(v | 0, w | 0, b | 0, l | 0) | 0;
 R = x;
 u = Mb(j | 0, Uc | 0, t | 0, u | 0) | 0;
 t = x;
 Uc = ((Vc | 0) < 0) << 31 >> 31;
 l = Mb(Vc | 0, Uc | 0, b | 0, l | 0) | 0;
 b = x;
 j = ((k | 0) < 0) << 31 >> 31;
 xb = Mb(I | 0, J | 0, k | 0, j | 0) | 0;
 wb = x;
 Ra = Mb(K | 0, L | 0, k | 0, j | 0) | 0;
 Qa = x;
 vc = Mb(G | 0, H | 0, k | 0, j | 0) | 0;
 uc = x;
 Pb = Mb(E | 0, F | 0, k | 0, j | 0) | 0;
 Lb = x;
 $a = Mb(C | 0, D | 0, k | 0, j | 0) | 0;
 _a = x;
 oa = Mb(A | 0, B | 0, k | 0, j | 0) | 0;
 na = x;
 U = Mb(y | 0, z | 0, k | 0, j | 0) | 0;
 T = x;
 w = Mb(v | 0, w | 0, k | 0, j | 0) | 0;
 v = x;
 Wc = ((Xc | 0) < 0) << 31 >> 31;
 Dc = Mb(Xc | 0, Wc | 0, k | 0, j | 0) | 0;
 Cc = x;
 j = Mb(Vc | 0, Uc | 0, k | 0, j | 0) | 0;
 k = x;
 Zb = ((Yb | 0) < 0) << 31 >> 31;
 Pa = Mb(I | 0, J | 0, Yb | 0, Zb | 0) | 0;
 Oa = x;
 q = ((i | 0) < 0) << 31 >> 31;
 zc = Mb(K | 0, L | 0, i | 0, q | 0) | 0;
 yc = x;
 Tb = Mb(G | 0, H | 0, Yb | 0, Zb | 0) | 0;
 Sb = x;
 bb = Mb(E | 0, F | 0, i | 0, q | 0) | 0;
 ab = x;
 qa = Mb(C | 0, D | 0, Yb | 0, Zb | 0) | 0;
 pa = x;
 W = Mb(A | 0, B | 0, i | 0, q | 0) | 0;
 V = x;
 z = Mb(y | 0, z | 0, Yb | 0, Zb | 0) | 0;
 y = x;
 Va = ((Ua | 0) < 0) << 31 >> 31;
 Fc = Mb(Ua | 0, Va | 0, i | 0, q | 0) | 0;
 Ec = x;
 Zb = Mb(Xc | 0, Wc | 0, Yb | 0, Zb | 0) | 0;
 Yb = x;
 q = Mb(Vc | 0, Uc | 0, i | 0, q | 0) | 0;
 i = x;
 za = ((g | 0) < 0) << 31 >> 31;
 xc = Mb(I | 0, J | 0, g | 0, za | 0) | 0;
 wc = x;
 Xb = Mb(K | 0, L | 0, g | 0, za | 0) | 0;
 Wb = x;
 db = Mb(G | 0, H | 0, g | 0, za | 0) | 0;
 cb = x;
 sa = Mb(E | 0, F | 0, g | 0, za | 0) | 0;
 ra = x;
 Y = Mb(C | 0, D | 0, g | 0, za | 0) | 0;
 X = x;
 B = Mb(A | 0, B | 0, g | 0, za | 0) | 0;
 A = x;
 Gb = ((Fb | 0) < 0) << 31 >> 31;
 Hc = Mb(Fb | 0, Gb | 0, g | 0, za | 0) | 0;
 Gc = x;
 $b = Mb(Ua | 0, Va | 0, g | 0, za | 0) | 0;
 _b = x;
 jb = Mb(Xc | 0, Wc | 0, g | 0, za | 0) | 0;
 ib = x;
 za = Mb(Vc | 0, Uc | 0, g | 0, za | 0) | 0;
 g = x;
 Ba = ((Aa | 0) < 0) << 31 >> 31;
 Vb = Mb(I | 0, J | 0, Aa | 0, Ba | 0) | 0;
 Ub = x;
 p = ((f | 0) < 0) << 31 >> 31;
 hb = Mb(K | 0, L | 0, f | 0, p | 0) | 0;
 gb = x;
 ua = Mb(G | 0, H | 0, Aa | 0, Ba | 0) | 0;
 ta = x;
 _ = Mb(E | 0, F | 0, f | 0, p | 0) | 0;
 Z = x;
 D = Mb(C | 0, D | 0, Aa | 0, Ba | 0) | 0;
 C = x;
 pc = ((oc | 0) < 0) << 31 >> 31;
 Jc = Mb(oc | 0, pc | 0, f | 0, p | 0) | 0;
 Ic = x;
 bc = Mb(Fb | 0, Gb | 0, Aa | 0, Ba | 0) | 0;
 ac = x;
 lb = Mb(Ua | 0, Va | 0, f | 0, p | 0) | 0;
 kb = x;
 Ba = Mb(Xc | 0, Wc | 0, Aa | 0, Ba | 0) | 0;
 Aa = x;
 p = Mb(Vc | 0, Uc | 0, f | 0, p | 0) | 0;
 f = x;
 Ab = ((h | 0) < 0) << 31 >> 31;
 fb = Mb(I | 0, J | 0, h | 0, Ab | 0) | 0;
 eb = x;
 ya = Mb(K | 0, L | 0, h | 0, Ab | 0) | 0;
 xa = x;
 aa = Mb(G | 0, H | 0, h | 0, Ab | 0) | 0;
 $ = x;
 F = Mb(E | 0, F | 0, h | 0, Ab | 0) | 0;
 E = x;
 Ja = ((Ia | 0) < 0) << 31 >> 31;
 Lc = Mb(Ia | 0, Ja | 0, h | 0, Ab | 0) | 0;
 Kc = x;
 dc = Mb(oc | 0, pc | 0, h | 0, Ab | 0) | 0;
 cc = x;
 nb = Mb(Fb | 0, Gb | 0, h | 0, Ab | 0) | 0;
 mb = x;
 Da = Mb(Ua | 0, Va | 0, h | 0, Ab | 0) | 0;
 Ca = x;
 m = Mb(Xc | 0, Wc | 0, h | 0, Ab | 0) | 0;
 n = x;
 Ab = Mb(Vc | 0, Uc | 0, h | 0, Ab | 0) | 0;
 h = x;
 Cb = ((Bb | 0) < 0) << 31 >> 31;
 wa = Mb(I | 0, J | 0, Bb | 0, Cb | 0) | 0;
 va = x;
 d = ((e | 0) < 0) << 31 >> 31;
 ea = Mb(K | 0, L | 0, e | 0, d | 0) | 0;
 da = x;
 H = Mb(G | 0, H | 0, Bb | 0, Cb | 0) | 0;
 G = x;
 tb = ((sb | 0) < 0) << 31 >> 31;
 Nc = Mb(sb | 0, tb | 0, e | 0, d | 0) | 0;
 Mc = x;
 fc = Mb(Ia | 0, Ja | 0, Bb | 0, Cb | 0) | 0;
 ec = x;
 pb = Mb(oc | 0, pc | 0, e | 0, d | 0) | 0;
 ob = x;
 Fa = Mb(Fb | 0, Gb | 0, Bb | 0, Cb | 0) | 0;
 Ea = x;
 M = Mb(Ua | 0, Va | 0, e | 0, d | 0) | 0;
 o = x;
 Cb = Mb(Xc | 0, Wc | 0, Bb | 0, Cb | 0) | 0;
 Bb = x;
 d = Mb(Vc | 0, Uc | 0, e | 0, d | 0) | 0;
 e = x;
 ga = ((fa | 0) < 0) << 31 >> 31;
 ca = Mb(I | 0, J | 0, fa | 0, ga | 0) | 0;
 ba = x;
 L = Mb(K | 0, L | 0, fa | 0, ga | 0) | 0;
 K = x;
 jc = ((ic | 0) < 0) << 31 >> 31;
 Pc = Mb(ic | 0, jc | 0, fa | 0, ga | 0) | 0;
 Oc = x;
 hc = Mb(sb | 0, tb | 0, fa | 0, ga | 0) | 0;
 gc = x;
 rb = Mb(Ia | 0, Ja | 0, fa | 0, ga | 0) | 0;
 qb = x;
 Ha = Mb(oc | 0, pc | 0, fa | 0, ga | 0) | 0;
 Ga = x;
 nc = Mb(Fb | 0, Gb | 0, fa | 0, ga | 0) | 0;
 mc = x;
 Eb = Mb(Ua | 0, Va | 0, fa | 0, ga | 0) | 0;
 Db = x;
 Ta = Mb(Xc | 0, Wc | 0, fa | 0, ga | 0) | 0;
 Sa = x;
 ga = Mb(Vc | 0, Uc | 0, fa | 0, ga | 0) | 0;
 fa = x;
 ia = ((ha | 0) < 0) << 31 >> 31;
 J = Mb(I | 0, J | 0, ha | 0, ia | 0) | 0;
 I = x;
 O = ((N | 0) < 0) << 31 >> 31;
 Tc = Mb(Tc | 0, ((Tc | 0) < 0) << 31 >> 31 | 0, N | 0, O | 0) | 0;
 Sc = x;
 jc = Mb(ic | 0, jc | 0, ha | 0, ia | 0) | 0;
 ic = x;
 tb = Mb(sb | 0, tb | 0, N | 0, O | 0) | 0;
 sb = x;
 Ja = Mb(Ia | 0, Ja | 0, ha | 0, ia | 0) | 0;
 Ia = x;
 pc = Mb(oc | 0, pc | 0, N | 0, O | 0) | 0;
 oc = x;
 Gb = Mb(Fb | 0, Gb | 0, ha | 0, ia | 0) | 0;
 Fb = x;
 Va = Mb(Ua | 0, Va | 0, N | 0, O | 0) | 0;
 Ua = x;
 ia = Mb(Xc | 0, Wc | 0, ha | 0, ia | 0) | 0;
 ha = x;
 O = Mb(Vc | 0, Uc | 0, N | 0, O | 0) | 0;
 N = x;
 Qc = Qb(Tc | 0, Sc | 0, Rc | 0, Qc | 0) | 0;
 Oc = Qb(Qc | 0, x | 0, Pc | 0, Oc | 0) | 0;
 Mc = Qb(Oc | 0, x | 0, Nc | 0, Mc | 0) | 0;
 Kc = Qb(Mc | 0, x | 0, Lc | 0, Kc | 0) | 0;
 Ic = Qb(Kc | 0, x | 0, Jc | 0, Ic | 0) | 0;
 Gc = Qb(Ic | 0, x | 0, Hc | 0, Gc | 0) | 0;
 Ec = Qb(Gc | 0, x | 0, Fc | 0, Ec | 0) | 0;
 Cc = Qb(Ec | 0, x | 0, Dc | 0, Cc | 0) | 0;
 b = Qb(Cc | 0, x | 0, l | 0, b | 0) | 0;
 l = x;
 lc = Qb(Bc | 0, Ac | 0, kc | 0, lc | 0) | 0;
 kc = x;
 wc = Qb(zc | 0, yc | 0, xc | 0, wc | 0) | 0;
 uc = Qb(wc | 0, x | 0, vc | 0, uc | 0) | 0;
 sc = Qb(uc | 0, x | 0, tc | 0, sc | 0) | 0;
 qc = Qb(sc | 0, x | 0, rc | 0, qc | 0) | 0;
 oc = Qb(qc | 0, x | 0, pc | 0, oc | 0) | 0;
 mc = Qb(oc | 0, x | 0, nc | 0, mc | 0) | 0;
 o = Qb(mc | 0, x | 0, M | 0, o | 0) | 0;
 n = Qb(o | 0, x | 0, m | 0, n | 0) | 0;
 f = Qb(n | 0, x | 0, p | 0, f | 0) | 0;
 p = x;
 n = Qb(b | 0, l | 0, 33554432, 0) | 0;
 m = x;
 o = Nb(n | 0, m | 0, 26) | 0;
 M = x;
 ic = Qb(lc | 0, kc | 0, jc | 0, ic | 0) | 0;
 gc = Qb(ic | 0, x | 0, hc | 0, gc | 0) | 0;
 ec = Qb(gc | 0, x | 0, fc | 0, ec | 0) | 0;
 cc = Qb(ec | 0, x | 0, dc | 0, cc | 0) | 0;
 ac = Qb(cc | 0, x | 0, bc | 0, ac | 0) | 0;
 _b = Qb(ac | 0, x | 0, $b | 0, _b | 0) | 0;
 Yb = Qb(_b | 0, x | 0, Zb | 0, Yb | 0) | 0;
 k = Qb(Yb | 0, x | 0, j | 0, k | 0) | 0;
 M = Qb(k | 0, x | 0, o | 0, M | 0) | 0;
 o = x;
 m = Rb(b | 0, l | 0, n & -67108864 | 0, m | 0) | 0;
 n = x;
 l = Qb(f | 0, p | 0, 33554432, 0) | 0;
 b = x;
 k = Nb(l | 0, b | 0, 26) | 0;
 j = x;
 Ub = Qb(Xb | 0, Wb | 0, Vb | 0, Ub | 0) | 0;
 Sb = Qb(Ub | 0, x | 0, Tb | 0, Sb | 0) | 0;
 Lb = Qb(Sb | 0, x | 0, Pb | 0, Lb | 0) | 0;
 Jb = Qb(Lb | 0, x | 0, Kb | 0, Jb | 0) | 0;
 Hb = Qb(Jb | 0, x | 0, Ib | 0, Hb | 0) | 0;
 Fb = Qb(Hb | 0, x | 0, Gb | 0, Fb | 0) | 0;
 Db = Qb(Fb | 0, x | 0, Eb | 0, Db | 0) | 0;
 Bb = Qb(Db | 0, x | 0, Cb | 0, Bb | 0) | 0;
 h = Qb(Bb | 0, x | 0, Ab | 0, h | 0) | 0;
 j = Qb(h | 0, x | 0, k | 0, j | 0) | 0;
 k = x;
 b = Rb(f | 0, p | 0, l & -67108864 | 0, b | 0) | 0;
 l = x;
 p = Qb(M | 0, o | 0, 16777216, 0) | 0;
 f = Nb(p | 0, x | 0, 25) | 0;
 h = x;
 wb = Qb(zb | 0, yb | 0, xb | 0, wb | 0) | 0;
 ub = Qb(wb | 0, x | 0, vb | 0, ub | 0) | 0;
 sb = Qb(ub | 0, x | 0, tb | 0, sb | 0) | 0;
 qb = Qb(sb | 0, x | 0, rb | 0, qb | 0) | 0;
 ob = Qb(qb | 0, x | 0, pb | 0, ob | 0) | 0;
 mb = Qb(ob | 0, x | 0, nb | 0, mb | 0) | 0;
 kb = Qb(mb | 0, x | 0, lb | 0, kb | 0) | 0;
 ib = Qb(kb | 0, x | 0, jb | 0, ib | 0) | 0;
 i = Qb(ib | 0, x | 0, q | 0, i | 0) | 0;
 h = Qb(i | 0, x | 0, f | 0, h | 0) | 0;
 f = x;
 p = Rb(M | 0, o | 0, p & -33554432 | 0, 0) | 0;
 o = x;
 M = Qb(j | 0, k | 0, 16777216, 0) | 0;
 i = Nb(M | 0, x | 0, 25) | 0;
 q = x;
 eb = Qb(hb | 0, gb | 0, fb | 0, eb | 0) | 0;
 cb = Qb(eb | 0, x | 0, db | 0, cb | 0) | 0;
 ab = Qb(cb | 0, x | 0, bb | 0, ab | 0) | 0;
 _a = Qb(ab | 0, x | 0, $a | 0, _a | 0) | 0;
 Ya = Qb(_a | 0, x | 0, Za | 0, Ya | 0) | 0;
 Wa = Qb(Ya | 0, x | 0, Xa | 0, Wa | 0) | 0;
 Ua = Qb(Wa | 0, x | 0, Va | 0, Ua | 0) | 0;
 Sa = Qb(Ua | 0, x | 0, Ta | 0, Sa | 0) | 0;
 e = Qb(Sa | 0, x | 0, d | 0, e | 0) | 0;
 q = Qb(e | 0, x | 0, i | 0, q | 0) | 0;
 i = x;
 M = Rb(j | 0, k | 0, M & -33554432 | 0, 0) | 0;
 k = x;
 j = Qb(h | 0, f | 0, 33554432, 0) | 0;
 e = Nb(j | 0, x | 0, 26) | 0;
 d = x;
 Oa = Qb(Ra | 0, Qa | 0, Pa | 0, Oa | 0) | 0;
 Ma = Qb(Oa | 0, x | 0, Na | 0, Ma | 0) | 0;
 Ka = Qb(Ma | 0, x | 0, La | 0, Ka | 0) | 0;
 Ia = Qb(Ka | 0, x | 0, Ja | 0, Ia | 0) | 0;
 Ga = Qb(Ia | 0, x | 0, Ha | 0, Ga | 0) | 0;
 Ea = Qb(Ga | 0, x | 0, Fa | 0, Ea | 0) | 0;
 Ca = Qb(Ea | 0, x | 0, Da | 0, Ca | 0) | 0;
 Aa = Qb(Ca | 0, x | 0, Ba | 0, Aa | 0) | 0;
 g = Qb(Aa | 0, x | 0, za | 0, g | 0) | 0;
 d = Qb(g | 0, x | 0, e | 0, d | 0) | 0;
 e = x;
 j = Rb(h | 0, f | 0, j & -67108864 | 0, 0) | 0;
 f = Qb(q | 0, i | 0, 33554432, 0) | 0;
 h = Nb(f | 0, x | 0, 26) | 0;
 g = x;
 va = Qb(ya | 0, xa | 0, wa | 0, va | 0) | 0;
 ta = Qb(va | 0, x | 0, ua | 0, ta | 0) | 0;
 ra = Qb(ta | 0, x | 0, sa | 0, ra | 0) | 0;
 pa = Qb(ra | 0, x | 0, qa | 0, pa | 0) | 0;
 na = Qb(pa | 0, x | 0, oa | 0, na | 0) | 0;
 la = Qb(na | 0, x | 0, ma | 0, la | 0) | 0;
 ja = Qb(la | 0, x | 0, ka | 0, ja | 0) | 0;
 ha = Qb(ja | 0, x | 0, ia | 0, ha | 0) | 0;
 fa = Qb(ha | 0, x | 0, ga | 0, fa | 0) | 0;
 g = Qb(fa | 0, x | 0, h | 0, g | 0) | 0;
 h = x;
 f = Rb(q | 0, i | 0, f & -67108864 | 0, 0) | 0;
 i = Qb(d | 0, e | 0, 16777216, 0) | 0;
 q = Nb(i | 0, x | 0, 25) | 0;
 l = Qb(q | 0, x | 0, b | 0, l | 0) | 0;
 b = x;
 i = Rb(d | 0, e | 0, i & -33554432 | 0, 0) | 0;
 e = Qb(g | 0, h | 0, 16777216, 0) | 0;
 d = Nb(e | 0, x | 0, 25) | 0;
 q = x;
 ba = Qb(ea | 0, da | 0, ca | 0, ba | 0) | 0;
 $ = Qb(ba | 0, x | 0, aa | 0, $ | 0) | 0;
 Z = Qb($ | 0, x | 0, _ | 0, Z | 0) | 0;
 X = Qb(Z | 0, x | 0, Y | 0, X | 0) | 0;
 V = Qb(X | 0, x | 0, W | 0, V | 0) | 0;
 T = Qb(V | 0, x | 0, U | 0, T | 0) | 0;
 R = Qb(T | 0, x | 0, S | 0, R | 0) | 0;
 P = Qb(R | 0, x | 0, Q | 0, P | 0) | 0;
 N = Qb(P | 0, x | 0, O | 0, N | 0) | 0;
 q = Qb(N | 0, x | 0, d | 0, q | 0) | 0;
 d = x;
 e = Rb(g | 0, h | 0, e & -33554432 | 0, 0) | 0;
 h = Qb(l | 0, b | 0, 33554432, 0) | 0;
 g = Ob(h | 0, x | 0, 26) | 0;
 g = Qb(M | 0, k | 0, g | 0, x | 0) | 0;
 h = Rb(l | 0, b | 0, h & -67108864 | 0, 0) | 0;
 b = Qb(q | 0, d | 0, 33554432, 0) | 0;
 l = Nb(b | 0, x | 0, 26) | 0;
 k = x;
 I = Qb(L | 0, K | 0, J | 0, I | 0) | 0;
 G = Qb(I | 0, x | 0, H | 0, G | 0) | 0;
 E = Qb(G | 0, x | 0, F | 0, E | 0) | 0;
 C = Qb(E | 0, x | 0, D | 0, C | 0) | 0;
 A = Qb(C | 0, x | 0, B | 0, A | 0) | 0;
 y = Qb(A | 0, x | 0, z | 0, y | 0) | 0;
 v = Qb(y | 0, x | 0, w | 0, v | 0) | 0;
 t = Qb(v | 0, x | 0, u | 0, t | 0) | 0;
 r = Qb(t | 0, x | 0, s | 0, r | 0) | 0;
 k = Qb(r | 0, x | 0, l | 0, k | 0) | 0;
 l = x;
 b = Rb(q | 0, d | 0, b & -67108864 | 0, 0) | 0;
 d = Qb(k | 0, l | 0, 16777216, 0) | 0;
 q = Nb(d | 0, x | 0, 25) | 0;
 q = Mb(q | 0, x | 0, 19, 0) | 0;
 n = Qb(q | 0, x | 0, m | 0, n | 0) | 0;
 m = x;
 d = Rb(k | 0, l | 0, d & -33554432 | 0, 0) | 0;
 l = Qb(n | 0, m | 0, 33554432, 0) | 0;
 k = Ob(l | 0, x | 0, 26) | 0;
 k = Qb(p | 0, o | 0, k | 0, x | 0) | 0;
 l = Rb(n | 0, m | 0, l & -67108864 | 0, 0) | 0;
 c[a >> 2] = l;
 c[a + 4 >> 2] = k;
 c[a + 8 >> 2] = j;
 c[a + 12 >> 2] = i;
 c[a + 16 >> 2] = h;
 c[a + 20 >> 2] = g;
 c[a + 24 >> 2] = f;
 c[a + 28 >> 2] = e;
 c[a + 32 >> 2] = b;
 c[a + 36 >> 2] = d;
 return;
}
function Ab(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0;
 T = k;
 k = k + 640 | 0;
 S = T;
 d = Bb(a) | 0;
 e = x;
 R = S;
 c[R >> 2] = d;
 c[R + 4 >> 2] = e;
 R = Bb(a + 8 | 0) | 0;
 Q = S + 8 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 16 | 0) | 0;
 R = S + 16 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 24 | 0) | 0;
 Q = S + 24 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 32 | 0) | 0;
 R = S + 32 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 40 | 0) | 0;
 Q = S + 40 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 48 | 0) | 0;
 R = S + 48 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 56 | 0) | 0;
 Q = S + 56 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 64 | 0) | 0;
 R = S + 64 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 72 | 0) | 0;
 Q = S + 72 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 80 | 0) | 0;
 R = S + 80 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 88 | 0) | 0;
 Q = S + 88 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 96 | 0) | 0;
 R = S + 96 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 104 | 0) | 0;
 Q = S + 104 | 0;
 c[Q >> 2] = R;
 c[Q + 4 >> 2] = x;
 Q = Bb(a + 112 | 0) | 0;
 R = S + 112 | 0;
 c[R >> 2] = Q;
 c[R + 4 >> 2] = x;
 R = Bb(a + 120 | 0) | 0;
 a = S + 120 | 0;
 c[a >> 2] = R;
 c[a + 4 >> 2] = x;
 a = 16;
 do {
  I = S + (a + -2 << 3) | 0;
  E = c[I >> 2] | 0;
  I = c[I + 4 >> 2] | 0;
  J = Pb(E | 0, I | 0, 45) | 0;
  L = x;
  K = Ob(E | 0, I | 0, 19) | 0;
  L = L | x;
  G = Pb(E | 0, I | 0, 3) | 0;
  F = x;
  H = Ob(E | 0, I | 0, 61) | 0;
  F = F | x;
  I = Ob(E | 0, I | 0, 6) | 0;
  L = F ^ x ^ L;
  F = S + (a + -7 << 3) | 0;
  E = c[F >> 2] | 0;
  F = c[F + 4 >> 2] | 0;
  P = S + (a + -15 << 3) | 0;
  C = d;
  d = c[P >> 2] | 0;
  D = e;
  e = c[P + 4 >> 2] | 0;
  P = Pb(d | 0, e | 0, 63) | 0;
  Q = x;
  R = Ob(d | 0, e | 0, 1) | 0;
  Q = Q | x;
  M = Pb(d | 0, e | 0, 56) | 0;
  B = x;
  N = Ob(d | 0, e | 0, 8) | 0;
  B = B | x;
  O = Ob(d | 0, e | 0, 7) | 0;
  Q = B ^ x ^ Q;
  F = Qb(C | 0, D | 0, E | 0, F | 0) | 0;
  L = Qb(F | 0, x | 0, (G | H) ^ I ^ (J | K) | 0, L | 0) | 0;
  Q = Qb(L | 0, x | 0, (M | N) ^ O ^ (P | R) | 0, Q | 0) | 0;
  R = S + (a << 3) | 0;
  c[R >> 2] = Q;
  c[R + 4 >> 2] = x;
  a = a + 1 | 0;
 } while ((a | 0) != 80);
 e = b;
 d = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 f = b + 8 | 0;
 h = f;
 g = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 i = b + 16 | 0;
 l = i;
 j = c[l >> 2] | 0;
 l = c[l + 4 >> 2] | 0;
 m = b + 24 | 0;
 o = m;
 n = c[o >> 2] | 0;
 o = c[o + 4 >> 2] | 0;
 p = b + 32 | 0;
 r = p;
 q = c[r >> 2] | 0;
 r = c[r + 4 >> 2] | 0;
 s = b + 40 | 0;
 u = s;
 t = c[u >> 2] | 0;
 u = c[u + 4 >> 2] | 0;
 v = b + 48 | 0;
 y = v;
 w = c[y >> 2] | 0;
 y = c[y + 4 >> 2] | 0;
 z = b + 56 | 0;
 B = z;
 A = c[B >> 2] | 0;
 B = c[B + 4 >> 2] | 0;
 a = 0;
 C = q;
 D = r;
 E = t;
 F = w;
 G = u;
 H = y;
 I = A;
 J = B;
 K = d;
 L = e;
 M = g;
 N = h;
 O = j;
 P = l;
 Q = n;
 R = o;
 do {
  ia = Pb(C | 0, D | 0, 50) | 0;
  ja = x;
  qa = Ob(C | 0, D | 0, 14) | 0;
  ja = ja | x;
  _ = Pb(C | 0, D | 0, 46) | 0;
  V = x;
  na = Ob(C | 0, D | 0, 18) | 0;
  V = ja ^ (V | x);
  ja = Pb(C | 0, D | 0, 23) | 0;
  da = x;
  oa = Ob(C | 0, D | 0, 41) | 0;
  da = V ^ (da | x);
  V = 31904 + (a << 3) | 0;
  ha = c[V >> 2] | 0;
  V = c[V + 4 >> 2] | 0;
  ma = S + (a << 3) | 0;
  W = c[ma >> 2] | 0;
  ma = c[ma + 4 >> 2] | 0;
  U = Qb((E ^ F) & C ^ F | 0, (G ^ H) & D ^ H | 0, I | 0, J | 0) | 0;
  da = Qb(U | 0, x | 0, (ia | qa) ^ (_ | na) ^ (ja | oa) | 0, da | 0) | 0;
  V = Qb(da | 0, x | 0, ha | 0, V | 0) | 0;
  ma = Qb(V | 0, x | 0, W | 0, ma | 0) | 0;
  W = x;
  V = Pb(K | 0, L | 0, 36) | 0;
  ha = x;
  da = Ob(K | 0, L | 0, 28) | 0;
  ha = ha | x;
  oa = Pb(K | 0, L | 0, 30) | 0;
  ja = x;
  na = Ob(K | 0, L | 0, 34) | 0;
  ja = ha ^ (ja | x);
  ha = Pb(K | 0, L | 0, 25) | 0;
  _ = x;
  qa = Ob(K | 0, L | 0, 39) | 0;
  _ = Qb((V | da) ^ (oa | na) ^ (ha | qa) | 0, ja ^ (_ | x) | 0, (K | M) & O | K & M | 0, (L | N) & P | L & N | 0) | 0;
  ja = x;
  qa = Qb(ma | 0, W | 0, Q | 0, R | 0) | 0;
  ha = x;
  W = Qb(_ | 0, ja | 0, ma | 0, W | 0) | 0;
  ma = x;
  ja = Pb(qa | 0, ha | 0, 50) | 0;
  _ = x;
  na = Ob(qa | 0, ha | 0, 14) | 0;
  _ = _ | x;
  oa = Pb(qa | 0, ha | 0, 46) | 0;
  da = x;
  V = Ob(qa | 0, ha | 0, 18) | 0;
  da = _ ^ (da | x);
  _ = Pb(qa | 0, ha | 0, 23) | 0;
  ia = x;
  U = Ob(qa | 0, ha | 0, 41) | 0;
  ia = da ^ (ia | x);
  da = a | 1;
  ga = 31904 + (da << 3) | 0;
  da = S + (da << 3) | 0;
  aa = c[da >> 2] | 0;
  da = c[da + 4 >> 2] | 0;
  ga = Qb(c[ga >> 2] | 0, c[ga + 4 >> 2] | 0, F | 0, H | 0) | 0;
  da = Qb(ga | 0, x | 0, aa | 0, da | 0) | 0;
  da = Qb(da | 0, x | 0, qa & (C ^ E) ^ E | 0, ha & (D ^ G) ^ G | 0) | 0;
  ia = Qb(da | 0, x | 0, (ja | na) ^ (oa | V) ^ (_ | U) | 0, ia | 0) | 0;
  U = x;
  _ = Pb(W | 0, ma | 0, 36) | 0;
  V = x;
  oa = Ob(W | 0, ma | 0, 28) | 0;
  V = V | x;
  na = Pb(W | 0, ma | 0, 30) | 0;
  ja = x;
  da = Ob(W | 0, ma | 0, 34) | 0;
  ja = V ^ (ja | x);
  V = Pb(W | 0, ma | 0, 25) | 0;
  aa = x;
  ga = Ob(W | 0, ma | 0, 39) | 0;
  aa = Qb((_ | oa) ^ (na | da) ^ (V | ga) | 0, ja ^ (aa | x) | 0, (W | K) & M | W & K | 0, (ma | L) & N | ma & L | 0) | 0;
  ja = x;
  ga = Qb(ia | 0, U | 0, O | 0, P | 0) | 0;
  V = x;
  U = Qb(aa | 0, ja | 0, ia | 0, U | 0) | 0;
  ia = x;
  ja = Pb(ga | 0, V | 0, 50) | 0;
  aa = x;
  da = Ob(ga | 0, V | 0, 14) | 0;
  aa = aa | x;
  na = Pb(ga | 0, V | 0, 46) | 0;
  oa = x;
  _ = Ob(ga | 0, V | 0, 18) | 0;
  oa = aa ^ (oa | x);
  aa = Pb(ga | 0, V | 0, 23) | 0;
  ea = x;
  $ = Ob(ga | 0, V | 0, 41) | 0;
  ea = oa ^ (ea | x);
  oa = a | 2;
  ca = 31904 + (oa << 3) | 0;
  oa = S + (oa << 3) | 0;
  ba = c[oa >> 2] | 0;
  oa = c[oa + 4 >> 2] | 0;
  ca = Qb(c[ca >> 2] | 0, c[ca + 4 >> 2] | 0, E | 0, G | 0) | 0;
  oa = Qb(ca | 0, x | 0, ba | 0, oa | 0) | 0;
  oa = Qb(oa | 0, x | 0, ga & (qa ^ C) ^ C | 0, V & (ha ^ D) ^ D | 0) | 0;
  ea = Qb(oa | 0, x | 0, (ja | da) ^ (na | _) ^ (aa | $) | 0, ea | 0) | 0;
  $ = x;
  aa = Pb(U | 0, ia | 0, 36) | 0;
  _ = x;
  na = Ob(U | 0, ia | 0, 28) | 0;
  _ = _ | x;
  da = Pb(U | 0, ia | 0, 30) | 0;
  ja = x;
  oa = Ob(U | 0, ia | 0, 34) | 0;
  ja = _ ^ (ja | x);
  _ = Pb(U | 0, ia | 0, 25) | 0;
  ba = x;
  ca = Ob(U | 0, ia | 0, 39) | 0;
  ba = Qb((aa | na) ^ (da | oa) ^ (_ | ca) | 0, ja ^ (ba | x) | 0, (U | W) & K | U & W | 0, (ia | ma) & L | ia & ma | 0) | 0;
  ja = x;
  ca = Qb(ea | 0, $ | 0, M | 0, N | 0) | 0;
  _ = x;
  $ = Qb(ba | 0, ja | 0, ea | 0, $ | 0) | 0;
  ea = x;
  ja = Pb(ca | 0, _ | 0, 50) | 0;
  ba = x;
  oa = Ob(ca | 0, _ | 0, 14) | 0;
  ba = ba | x;
  da = Pb(ca | 0, _ | 0, 46) | 0;
  na = x;
  aa = Ob(ca | 0, _ | 0, 18) | 0;
  na = ba ^ (na | x);
  ba = Pb(ca | 0, _ | 0, 23) | 0;
  Y = x;
  Z = Ob(ca | 0, _ | 0, 41) | 0;
  Y = na ^ (Y | x);
  na = a | 3;
  X = 31904 + (na << 3) | 0;
  na = S + (na << 3) | 0;
  pa = c[na >> 2] | 0;
  na = c[na + 4 >> 2] | 0;
  X = Qb(c[X >> 2] | 0, c[X + 4 >> 2] | 0, C | 0, D | 0) | 0;
  na = Qb(X | 0, x | 0, pa | 0, na | 0) | 0;
  na = Qb(na | 0, x | 0, ca & (ga ^ qa) ^ qa | 0, _ & (V ^ ha) ^ ha | 0) | 0;
  Y = Qb(na | 0, x | 0, (ja | oa) ^ (da | aa) ^ (ba | Z) | 0, Y | 0) | 0;
  Z = x;
  ba = Pb($ | 0, ea | 0, 36) | 0;
  aa = x;
  da = Ob($ | 0, ea | 0, 28) | 0;
  aa = aa | x;
  oa = Pb($ | 0, ea | 0, 30) | 0;
  ja = x;
  na = Ob($ | 0, ea | 0, 34) | 0;
  ja = aa ^ (ja | x);
  aa = Pb($ | 0, ea | 0, 25) | 0;
  pa = x;
  X = Ob($ | 0, ea | 0, 39) | 0;
  pa = Qb((ba | da) ^ (oa | na) ^ (aa | X) | 0, ja ^ (pa | x) | 0, ($ | U) & W | $ & U | 0, (ea | ia) & ma | ea & ia | 0) | 0;
  ja = x;
  X = Qb(Y | 0, Z | 0, K | 0, L | 0) | 0;
  aa = x;
  Z = Qb(pa | 0, ja | 0, Y | 0, Z | 0) | 0;
  Y = x;
  ja = Pb(X | 0, aa | 0, 50) | 0;
  pa = x;
  na = Ob(X | 0, aa | 0, 14) | 0;
  pa = pa | x;
  oa = Pb(X | 0, aa | 0, 46) | 0;
  da = x;
  ba = Ob(X | 0, aa | 0, 18) | 0;
  da = pa ^ (da | x);
  pa = Pb(X | 0, aa | 0, 23) | 0;
  la = x;
  fa = Ob(X | 0, aa | 0, 41) | 0;
  la = da ^ (la | x);
  da = a | 4;
  ra = 31904 + (da << 3) | 0;
  da = S + (da << 3) | 0;
  ka = c[da >> 2] | 0;
  da = c[da + 4 >> 2] | 0;
  ha = Qb(c[ra >> 2] | 0, c[ra + 4 >> 2] | 0, qa | 0, ha | 0) | 0;
  da = Qb(ha | 0, x | 0, ka | 0, da | 0) | 0;
  da = Qb(da | 0, x | 0, X & (ca ^ ga) ^ ga | 0, aa & (_ ^ V) ^ V | 0) | 0;
  la = Qb(da | 0, x | 0, (ja | na) ^ (oa | ba) ^ (pa | fa) | 0, la | 0) | 0;
  fa = x;
  pa = Pb(Z | 0, Y | 0, 36) | 0;
  ba = x;
  oa = Ob(Z | 0, Y | 0, 28) | 0;
  ba = ba | x;
  na = Pb(Z | 0, Y | 0, 30) | 0;
  ja = x;
  da = Ob(Z | 0, Y | 0, 34) | 0;
  ja = ba ^ (ja | x);
  ba = Pb(Z | 0, Y | 0, 25) | 0;
  ka = x;
  ha = Ob(Z | 0, Y | 0, 39) | 0;
  ka = Qb((pa | oa) ^ (na | da) ^ (ba | ha) | 0, ja ^ (ka | x) | 0, (Z | $) & U | Z & $ | 0, (Y | ea) & ia | Y & ea | 0) | 0;
  ja = x;
  I = Qb(la | 0, fa | 0, W | 0, ma | 0) | 0;
  J = x;
  Q = Qb(ka | 0, ja | 0, la | 0, fa | 0) | 0;
  R = x;
  fa = Pb(I | 0, J | 0, 50) | 0;
  la = x;
  ja = Ob(I | 0, J | 0, 14) | 0;
  la = la | x;
  ka = Pb(I | 0, J | 0, 46) | 0;
  ma = x;
  W = Ob(I | 0, J | 0, 18) | 0;
  ma = la ^ (ma | x);
  la = Pb(I | 0, J | 0, 23) | 0;
  ha = x;
  ba = Ob(I | 0, J | 0, 41) | 0;
  ha = ma ^ (ha | x);
  ma = a | 5;
  da = 31904 + (ma << 3) | 0;
  ma = S + (ma << 3) | 0;
  da = Qb(c[ma >> 2] | 0, c[ma + 4 >> 2] | 0, c[da >> 2] | 0, c[da + 4 >> 2] | 0) | 0;
  V = Qb(da | 0, x | 0, ga | 0, V | 0) | 0;
  V = Qb(V | 0, x | 0, I & (X ^ ca) ^ ca | 0, J & (aa ^ _) ^ _ | 0) | 0;
  ha = Qb(V | 0, x | 0, (fa | ja) ^ (ka | W) ^ (la | ba) | 0, ha | 0) | 0;
  ba = x;
  la = Pb(Q | 0, R | 0, 36) | 0;
  W = x;
  ka = Ob(Q | 0, R | 0, 28) | 0;
  W = W | x;
  ja = Pb(Q | 0, R | 0, 30) | 0;
  fa = x;
  V = Ob(Q | 0, R | 0, 34) | 0;
  fa = W ^ (fa | x);
  W = Pb(Q | 0, R | 0, 25) | 0;
  ga = x;
  da = Ob(Q | 0, R | 0, 39) | 0;
  ga = Qb((la | ka) ^ (ja | V) ^ (W | da) | 0, fa ^ (ga | x) | 0, (Q | Z) & $ | Q & Z | 0, (R | Y) & ea | R & Y | 0) | 0;
  fa = x;
  F = Qb(ha | 0, ba | 0, U | 0, ia | 0) | 0;
  H = x;
  O = Qb(ga | 0, fa | 0, ha | 0, ba | 0) | 0;
  P = x;
  ba = Pb(F | 0, H | 0, 50) | 0;
  ha = x;
  fa = Ob(F | 0, H | 0, 14) | 0;
  ha = ha | x;
  ga = Pb(F | 0, H | 0, 46) | 0;
  ia = x;
  U = Ob(F | 0, H | 0, 18) | 0;
  ia = ha ^ (ia | x);
  ha = Pb(F | 0, H | 0, 23) | 0;
  da = x;
  W = Ob(F | 0, H | 0, 41) | 0;
  da = ia ^ (da | x);
  ia = a | 6;
  V = 31904 + (ia << 3) | 0;
  ia = S + (ia << 3) | 0;
  V = Qb(c[ia >> 2] | 0, c[ia + 4 >> 2] | 0, c[V >> 2] | 0, c[V + 4 >> 2] | 0) | 0;
  _ = Qb(V | 0, x | 0, ca | 0, _ | 0) | 0;
  _ = Qb(_ | 0, x | 0, F & (I ^ X) ^ X | 0, H & (J ^ aa) ^ aa | 0) | 0;
  da = Qb(_ | 0, x | 0, (ba | fa) ^ (ga | U) ^ (ha | W) | 0, da | 0) | 0;
  W = x;
  ha = Pb(O | 0, P | 0, 36) | 0;
  U = x;
  ga = Ob(O | 0, P | 0, 28) | 0;
  U = U | x;
  fa = Pb(O | 0, P | 0, 30) | 0;
  ba = x;
  _ = Ob(O | 0, P | 0, 34) | 0;
  ba = U ^ (ba | x);
  U = Pb(O | 0, P | 0, 25) | 0;
  ca = x;
  V = Ob(O | 0, P | 0, 39) | 0;
  ca = Qb((ha | ga) ^ (fa | _) ^ (U | V) | 0, ba ^ (ca | x) | 0, (O | Q) & Z | O & Q | 0, (P | R) & Y | P & R | 0) | 0;
  ba = x;
  E = Qb(da | 0, W | 0, $ | 0, ea | 0) | 0;
  G = x;
  M = Qb(ca | 0, ba | 0, da | 0, W | 0) | 0;
  N = x;
  W = Pb(E | 0, G | 0, 50) | 0;
  da = x;
  ba = Ob(E | 0, G | 0, 14) | 0;
  da = da | x;
  ca = Pb(E | 0, G | 0, 46) | 0;
  ea = x;
  $ = Ob(E | 0, G | 0, 18) | 0;
  ea = da ^ (ea | x);
  da = Pb(E | 0, G | 0, 23) | 0;
  V = x;
  U = Ob(E | 0, G | 0, 41) | 0;
  V = ea ^ (V | x);
  ea = a | 7;
  _ = 31904 + (ea << 3) | 0;
  ea = S + (ea << 3) | 0;
  _ = Qb(c[ea >> 2] | 0, c[ea + 4 >> 2] | 0, c[_ >> 2] | 0, c[_ + 4 >> 2] | 0) | 0;
  aa = Qb(_ | 0, x | 0, X | 0, aa | 0) | 0;
  aa = Qb(aa | 0, x | 0, E & (F ^ I) ^ I | 0, G & (H ^ J) ^ J | 0) | 0;
  V = Qb(aa | 0, x | 0, (W | ba) ^ (ca | $) ^ (da | U) | 0, V | 0) | 0;
  U = x;
  da = Pb(M | 0, N | 0, 36) | 0;
  $ = x;
  ca = Ob(M | 0, N | 0, 28) | 0;
  $ = $ | x;
  ba = Pb(M | 0, N | 0, 30) | 0;
  W = x;
  aa = Ob(M | 0, N | 0, 34) | 0;
  W = $ ^ (W | x);
  $ = Pb(M | 0, N | 0, 25) | 0;
  X = x;
  _ = Ob(M | 0, N | 0, 39) | 0;
  X = Qb((da | ca) ^ (ba | aa) ^ ($ | _) | 0, W ^ (X | x) | 0, (M | O) & Q | M & O | 0, (N | P) & R | N & P | 0) | 0;
  W = x;
  C = Qb(V | 0, U | 0, Z | 0, Y | 0) | 0;
  D = x;
  K = Qb(X | 0, W | 0, V | 0, U | 0) | 0;
  L = x;
  a = a + 8 | 0;
 } while (a >>> 0 < 80);
 ra = Qb(K | 0, L | 0, d | 0, e | 0) | 0;
 qa = b;
 c[qa >> 2] = ra;
 c[qa + 4 >> 2] = x;
 qa = Qb(M | 0, N | 0, g | 0, h | 0) | 0;
 ra = f;
 c[ra >> 2] = qa;
 c[ra + 4 >> 2] = x;
 ra = Qb(O | 0, P | 0, j | 0, l | 0) | 0;
 qa = i;
 c[qa >> 2] = ra;
 c[qa + 4 >> 2] = x;
 qa = Qb(Q | 0, R | 0, n | 0, o | 0) | 0;
 ra = m;
 c[ra >> 2] = qa;
 c[ra + 4 >> 2] = x;
 ra = Qb(C | 0, D | 0, q | 0, r | 0) | 0;
 qa = p;
 c[qa >> 2] = ra;
 c[qa + 4 >> 2] = x;
 qa = Qb(E | 0, G | 0, t | 0, u | 0) | 0;
 ra = s;
 c[ra >> 2] = qa;
 c[ra + 4 >> 2] = x;
 ra = Qb(F | 0, H | 0, w | 0, y | 0) | 0;
 qa = v;
 c[qa >> 2] = ra;
 c[qa + 4 >> 2] = x;
 qa = Qb(I | 0, J | 0, A | 0, B | 0) | 0;
 ra = z;
 c[ra >> 2] = qa;
 c[ra + 4 >> 2] = x;
 k = T;
 return;
}

function ya(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0;
 l = Nb(0, c[b >> 2] | 0, 32) | 0;
 e = x;
 e = Mb(l | 0, e | 0, l | 0, e | 0) | 0;
 l = a;
 c[l >> 2] = e;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[b >> 2] | 0, 31) | 0;
 e = x;
 o = b + 8 | 0;
 m = Nb(0, c[o >> 2] | 0, 32) | 0;
 e = Mb(m | 0, x | 0, l | 0, e | 0) | 0;
 l = a + 8 | 0;
 c[l >> 2] = e;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[o >> 2] | 0, 32) | 0;
 e = x;
 e = Mb(l | 0, e | 0, l | 0, e | 0) | 0;
 l = x;
 m = Nb(0, c[b >> 2] | 0, 32) | 0;
 g = x;
 k = b + 16 | 0;
 p = Nb(0, c[k >> 2] | 0, 32) | 0;
 g = Mb(p | 0, x | 0, m | 0, g | 0) | 0;
 l = Qb(g | 0, x | 0, e | 0, l | 0) | 0;
 l = Pb(l | 0, x | 0, 1) | 0;
 e = a + 16 | 0;
 c[e >> 2] = l;
 c[e + 4 >> 2] = x;
 e = Nb(0, c[o >> 2] | 0, 32) | 0;
 l = x;
 g = Nb(0, c[k >> 2] | 0, 32) | 0;
 l = Mb(g | 0, x | 0, e | 0, l | 0) | 0;
 e = x;
 g = Nb(0, c[b >> 2] | 0, 32) | 0;
 m = x;
 p = b + 24 | 0;
 f = Nb(0, c[p >> 2] | 0, 32) | 0;
 m = Mb(f | 0, x | 0, g | 0, m | 0) | 0;
 e = Qb(m | 0, x | 0, l | 0, e | 0) | 0;
 e = Pb(e | 0, x | 0, 1) | 0;
 l = a + 24 | 0;
 c[l >> 2] = e;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[k >> 2] | 0, 32) | 0;
 e = x;
 e = Mb(l | 0, e | 0, l | 0, e | 0) | 0;
 l = x;
 m = Nb(0, c[o >> 2] | 0, 30) | 0;
 g = x;
 f = Nb(0, c[p >> 2] | 0, 32) | 0;
 g = Mb(f | 0, x | 0, m | 0, g | 0) | 0;
 l = Qb(g | 0, x | 0, e | 0, l | 0) | 0;
 e = x;
 g = Nb(0, c[b >> 2] | 0, 31) | 0;
 m = x;
 f = b + 32 | 0;
 j = Nb(0, c[f >> 2] | 0, 32) | 0;
 m = Mb(j | 0, x | 0, g | 0, m | 0) | 0;
 m = Qb(l | 0, e | 0, m | 0, x | 0) | 0;
 e = a + 32 | 0;
 c[e >> 2] = m;
 c[e + 4 >> 2] = x;
 e = Nb(0, c[k >> 2] | 0, 32) | 0;
 m = x;
 l = Nb(0, c[p >> 2] | 0, 32) | 0;
 m = Mb(l | 0, x | 0, e | 0, m | 0) | 0;
 e = x;
 l = Nb(0, c[o >> 2] | 0, 32) | 0;
 g = x;
 j = Nb(0, c[f >> 2] | 0, 32) | 0;
 g = Mb(j | 0, x | 0, l | 0, g | 0) | 0;
 e = Qb(g | 0, x | 0, m | 0, e | 0) | 0;
 m = x;
 g = Nb(0, c[b >> 2] | 0, 32) | 0;
 l = x;
 j = b + 40 | 0;
 i = Nb(0, c[j >> 2] | 0, 32) | 0;
 l = Mb(i | 0, x | 0, g | 0, l | 0) | 0;
 l = Qb(e | 0, m | 0, l | 0, x | 0) | 0;
 l = Pb(l | 0, x | 0, 1) | 0;
 m = a + 40 | 0;
 c[m >> 2] = l;
 c[m + 4 >> 2] = x;
 m = Nb(0, c[p >> 2] | 0, 32) | 0;
 l = x;
 l = Mb(m | 0, l | 0, m | 0, l | 0) | 0;
 m = x;
 e = Nb(0, c[k >> 2] | 0, 32) | 0;
 g = x;
 i = Nb(0, c[f >> 2] | 0, 32) | 0;
 g = Mb(i | 0, x | 0, e | 0, g | 0) | 0;
 m = Qb(g | 0, x | 0, l | 0, m | 0) | 0;
 l = x;
 g = Nb(0, c[b >> 2] | 0, 32) | 0;
 e = x;
 i = b + 48 | 0;
 h = Nb(0, c[i >> 2] | 0, 32) | 0;
 e = Mb(h | 0, x | 0, g | 0, e | 0) | 0;
 e = Qb(m | 0, l | 0, e | 0, x | 0) | 0;
 l = x;
 m = Nb(0, c[o >> 2] | 0, 31) | 0;
 g = x;
 h = Nb(0, c[j >> 2] | 0, 32) | 0;
 g = Mb(h | 0, x | 0, m | 0, g | 0) | 0;
 g = Qb(e | 0, l | 0, g | 0, x | 0) | 0;
 g = Pb(g | 0, x | 0, 1) | 0;
 l = a + 48 | 0;
 c[l >> 2] = g;
 c[l + 4 >> 2] = x;
 l = Nb(0, c[p >> 2] | 0, 32) | 0;
 g = x;
 e = Nb(0, c[f >> 2] | 0, 32) | 0;
 g = Mb(e | 0, x | 0, l | 0, g | 0) | 0;
 l = x;
 e = Nb(0, c[k >> 2] | 0, 32) | 0;
 m = x;
 h = Nb(0, c[j >> 2] | 0, 32) | 0;
 m = Mb(h | 0, x | 0, e | 0, m | 0) | 0;
 l = Qb(m | 0, x | 0, g | 0, l | 0) | 0;
 g = x;
 m = Nb(0, c[o >> 2] | 0, 32) | 0;
 e = x;
 h = Nb(0, c[i >> 2] | 0, 32) | 0;
 e = Mb(h | 0, x | 0, m | 0, e | 0) | 0;
 e = Qb(l | 0, g | 0, e | 0, x | 0) | 0;
 g = x;
 l = Nb(0, c[b >> 2] | 0, 32) | 0;
 m = x;
 h = b + 56 | 0;
 q = Nb(0, c[h >> 2] | 0, 32) | 0;
 m = Mb(q | 0, x | 0, l | 0, m | 0) | 0;
 m = Qb(e | 0, g | 0, m | 0, x | 0) | 0;
 m = Pb(m | 0, x | 0, 1) | 0;
 g = a + 56 | 0;
 c[g >> 2] = m;
 c[g + 4 >> 2] = x;
 g = Nb(0, c[f >> 2] | 0, 32) | 0;
 m = x;
 m = Mb(g | 0, m | 0, g | 0, m | 0) | 0;
 g = x;
 e = Nb(0, c[k >> 2] | 0, 32) | 0;
 l = x;
 q = Nb(0, c[i >> 2] | 0, 32) | 0;
 l = Mb(q | 0, x | 0, e | 0, l | 0) | 0;
 e = x;
 q = Nb(0, c[b >> 2] | 0, 32) | 0;
 n = x;
 d = b + 64 | 0;
 s = Nb(0, c[d >> 2] | 0, 32) | 0;
 n = Mb(s | 0, x | 0, q | 0, n | 0) | 0;
 e = Qb(n | 0, x | 0, l | 0, e | 0) | 0;
 l = x;
 n = Nb(0, c[o >> 2] | 0, 32) | 0;
 q = x;
 s = Nb(0, c[h >> 2] | 0, 32) | 0;
 q = Mb(s | 0, x | 0, n | 0, q | 0) | 0;
 n = x;
 s = Nb(0, c[p >> 2] | 0, 32) | 0;
 r = x;
 t = Nb(0, c[j >> 2] | 0, 32) | 0;
 r = Mb(t | 0, x | 0, s | 0, r | 0) | 0;
 n = Qb(r | 0, x | 0, q | 0, n | 0) | 0;
 n = Pb(n | 0, x | 0, 1) | 0;
 n = Qb(e | 0, l | 0, n | 0, x | 0) | 0;
 n = Pb(n | 0, x | 0, 1) | 0;
 g = Qb(n | 0, x | 0, m | 0, g | 0) | 0;
 m = a + 64 | 0;
 c[m >> 2] = g;
 c[m + 4 >> 2] = x;
 m = Nb(0, c[f >> 2] | 0, 32) | 0;
 g = x;
 n = Nb(0, c[j >> 2] | 0, 32) | 0;
 g = Mb(n | 0, x | 0, m | 0, g | 0) | 0;
 m = x;
 n = Nb(0, c[p >> 2] | 0, 32) | 0;
 l = x;
 e = Nb(0, c[i >> 2] | 0, 32) | 0;
 l = Mb(e | 0, x | 0, n | 0, l | 0) | 0;
 m = Qb(l | 0, x | 0, g | 0, m | 0) | 0;
 g = x;
 l = Nb(0, c[k >> 2] | 0, 32) | 0;
 n = x;
 e = Nb(0, c[h >> 2] | 0, 32) | 0;
 n = Mb(e | 0, x | 0, l | 0, n | 0) | 0;
 n = Qb(m | 0, g | 0, n | 0, x | 0) | 0;
 g = x;
 m = Nb(0, c[o >> 2] | 0, 32) | 0;
 l = x;
 e = Nb(0, c[d >> 2] | 0, 32) | 0;
 l = Mb(e | 0, x | 0, m | 0, l | 0) | 0;
 l = Qb(n | 0, g | 0, l | 0, x | 0) | 0;
 g = x;
 n = Nb(0, c[b >> 2] | 0, 32) | 0;
 m = x;
 e = b + 72 | 0;
 b = Nb(0, c[e >> 2] | 0, 32) | 0;
 b = Mb(b | 0, x | 0, n | 0, m | 0) | 0;
 b = Qb(l | 0, g | 0, b | 0, x | 0) | 0;
 b = Pb(b | 0, x | 0, 1) | 0;
 g = a + 72 | 0;
 c[g >> 2] = b;
 c[g + 4 >> 2] = x;
 g = Nb(0, c[j >> 2] | 0, 32) | 0;
 b = x;
 b = Mb(g | 0, b | 0, g | 0, b | 0) | 0;
 g = x;
 l = Nb(0, c[f >> 2] | 0, 32) | 0;
 m = x;
 n = Nb(0, c[i >> 2] | 0, 32) | 0;
 m = Mb(n | 0, x | 0, l | 0, m | 0) | 0;
 g = Qb(m | 0, x | 0, b | 0, g | 0) | 0;
 b = x;
 m = Nb(0, c[k >> 2] | 0, 32) | 0;
 l = x;
 n = Nb(0, c[d >> 2] | 0, 32) | 0;
 l = Mb(n | 0, x | 0, m | 0, l | 0) | 0;
 l = Qb(g | 0, b | 0, l | 0, x | 0) | 0;
 b = x;
 g = Nb(0, c[p >> 2] | 0, 32) | 0;
 m = x;
 n = Nb(0, c[h >> 2] | 0, 32) | 0;
 m = Mb(n | 0, x | 0, g | 0, m | 0) | 0;
 g = x;
 o = Nb(0, c[o >> 2] | 0, 32) | 0;
 n = x;
 q = Nb(0, c[e >> 2] | 0, 32) | 0;
 n = Mb(q | 0, x | 0, o | 0, n | 0) | 0;
 g = Qb(n | 0, x | 0, m | 0, g | 0) | 0;
 g = Pb(g | 0, x | 0, 1) | 0;
 g = Qb(l | 0, b | 0, g | 0, x | 0) | 0;
 g = Pb(g | 0, x | 0, 1) | 0;
 b = a + 80 | 0;
 c[b >> 2] = g;
 c[b + 4 >> 2] = x;
 b = Nb(0, c[j >> 2] | 0, 32) | 0;
 g = x;
 l = Nb(0, c[i >> 2] | 0, 32) | 0;
 g = Mb(l | 0, x | 0, b | 0, g | 0) | 0;
 b = x;
 l = Nb(0, c[f >> 2] | 0, 32) | 0;
 m = x;
 n = Nb(0, c[h >> 2] | 0, 32) | 0;
 m = Mb(n | 0, x | 0, l | 0, m | 0) | 0;
 b = Qb(m | 0, x | 0, g | 0, b | 0) | 0;
 g = x;
 m = Nb(0, c[p >> 2] | 0, 32) | 0;
 l = x;
 n = Nb(0, c[d >> 2] | 0, 32) | 0;
 l = Mb(n | 0, x | 0, m | 0, l | 0) | 0;
 l = Qb(b | 0, g | 0, l | 0, x | 0) | 0;
 g = x;
 b = Nb(0, c[k >> 2] | 0, 32) | 0;
 k = x;
 m = Nb(0, c[e >> 2] | 0, 32) | 0;
 k = Mb(m | 0, x | 0, b | 0, k | 0) | 0;
 k = Qb(l | 0, g | 0, k | 0, x | 0) | 0;
 k = Pb(k | 0, x | 0, 1) | 0;
 g = a + 88 | 0;
 c[g >> 2] = k;
 c[g + 4 >> 2] = x;
 g = Nb(0, c[i >> 2] | 0, 32) | 0;
 k = x;
 k = Mb(g | 0, k | 0, g | 0, k | 0) | 0;
 g = x;
 l = Nb(0, c[f >> 2] | 0, 32) | 0;
 b = x;
 m = Nb(0, c[d >> 2] | 0, 32) | 0;
 b = Mb(m | 0, x | 0, l | 0, b | 0) | 0;
 l = x;
 m = Nb(0, c[j >> 2] | 0, 32) | 0;
 n = x;
 o = Nb(0, c[h >> 2] | 0, 32) | 0;
 n = Mb(o | 0, x | 0, m | 0, n | 0) | 0;
 m = x;
 p = Nb(0, c[p >> 2] | 0, 32) | 0;
 o = x;
 q = Nb(0, c[e >> 2] | 0, 32) | 0;
 o = Mb(q | 0, x | 0, p | 0, o | 0) | 0;
 m = Qb(o | 0, x | 0, n | 0, m | 0) | 0;
 m = Pb(m | 0, x | 0, 1) | 0;
 l = Qb(m | 0, x | 0, b | 0, l | 0) | 0;
 l = Pb(l | 0, x | 0, 1) | 0;
 g = Qb(l | 0, x | 0, k | 0, g | 0) | 0;
 k = a + 96 | 0;
 c[k >> 2] = g;
 c[k + 4 >> 2] = x;
 k = Nb(0, c[i >> 2] | 0, 32) | 0;
 g = x;
 l = Nb(0, c[h >> 2] | 0, 32) | 0;
 g = Mb(l | 0, x | 0, k | 0, g | 0) | 0;
 k = x;
 l = Nb(0, c[j >> 2] | 0, 32) | 0;
 b = x;
 m = Nb(0, c[d >> 2] | 0, 32) | 0;
 b = Mb(m | 0, x | 0, l | 0, b | 0) | 0;
 k = Qb(b | 0, x | 0, g | 0, k | 0) | 0;
 g = x;
 f = Nb(0, c[f >> 2] | 0, 32) | 0;
 b = x;
 l = Nb(0, c[e >> 2] | 0, 32) | 0;
 b = Mb(l | 0, x | 0, f | 0, b | 0) | 0;
 b = Qb(k | 0, g | 0, b | 0, x | 0) | 0;
 b = Pb(b | 0, x | 0, 1) | 0;
 g = a + 104 | 0;
 c[g >> 2] = b;
 c[g + 4 >> 2] = x;
 g = Nb(0, c[h >> 2] | 0, 32) | 0;
 b = x;
 b = Mb(g | 0, b | 0, g | 0, b | 0) | 0;
 g = x;
 k = Nb(0, c[i >> 2] | 0, 32) | 0;
 f = x;
 l = Nb(0, c[d >> 2] | 0, 32) | 0;
 f = Mb(l | 0, x | 0, k | 0, f | 0) | 0;
 g = Qb(f | 0, x | 0, b | 0, g | 0) | 0;
 b = x;
 j = Nb(0, c[j >> 2] | 0, 31) | 0;
 f = x;
 k = Nb(0, c[e >> 2] | 0, 32) | 0;
 f = Mb(k | 0, x | 0, j | 0, f | 0) | 0;
 f = Qb(g | 0, b | 0, f | 0, x | 0) | 0;
 f = Pb(f | 0, x | 0, 1) | 0;
 b = a + 112 | 0;
 c[b >> 2] = f;
 c[b + 4 >> 2] = x;
 b = Nb(0, c[h >> 2] | 0, 32) | 0;
 f = x;
 g = Nb(0, c[d >> 2] | 0, 32) | 0;
 f = Mb(g | 0, x | 0, b | 0, f | 0) | 0;
 b = x;
 i = Nb(0, c[i >> 2] | 0, 32) | 0;
 g = x;
 j = Nb(0, c[e >> 2] | 0, 32) | 0;
 g = Mb(j | 0, x | 0, i | 0, g | 0) | 0;
 b = Qb(g | 0, x | 0, f | 0, b | 0) | 0;
 b = Pb(b | 0, x | 0, 1) | 0;
 f = a + 120 | 0;
 c[f >> 2] = b;
 c[f + 4 >> 2] = x;
 f = Nb(0, c[d >> 2] | 0, 32) | 0;
 b = x;
 b = Mb(f | 0, b | 0, f | 0, b | 0) | 0;
 f = x;
 h = Nb(0, c[h >> 2] | 0, 30) | 0;
 g = x;
 i = Nb(0, c[e >> 2] | 0, 32) | 0;
 g = Mb(i | 0, x | 0, h | 0, g | 0) | 0;
 f = Qb(g | 0, x | 0, b | 0, f | 0) | 0;
 b = a + 128 | 0;
 c[b >> 2] = f;
 c[b + 4 >> 2] = x;
 b = Nb(0, c[d >> 2] | 0, 31) | 0;
 d = x;
 f = Nb(0, c[e >> 2] | 0, 32) | 0;
 d = Mb(f | 0, x | 0, b | 0, d | 0) | 0;
 b = a + 136 | 0;
 c[b >> 2] = d;
 c[b + 4 >> 2] = x;
 e = c[e >> 2] | 0;
 b = Nb(0, e | 0, 32) | 0;
 d = x;
 e = Nb(0, e | 0, 31) | 0;
 d = Mb(e | 0, x | 0, b | 0, d | 0) | 0;
 b = a + 144 | 0;
 c[b >> 2] = d;
 c[b + 4 >> 2] = x;
 return;
}

function Ta(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0, La = 0, Ma = 0, Na = 0, Oa = 0, Pa = 0, Qa = 0, Ra = 0, Sa = 0, Ta = 0, Ua = 0, Va = 0, Wa = 0, Xa = 0, Ya = 0, Za = 0, _a = 0, $a = 0, ab = 0, bb = 0, cb = 0, db = 0, eb = 0, fb = 0, gb = 0;
 bb = c[b >> 2] | 0;
 La = c[b + 4 >> 2] | 0;
 t = c[b + 8 >> 2] | 0;
 da = c[b + 12 >> 2] | 0;
 u = c[b + 16 >> 2] | 0;
 db = c[b + 20 >> 2] | 0;
 j = c[b + 24 >> 2] | 0;
 pa = c[b + 28 >> 2] | 0;
 g = c[b + 32 >> 2] | 0;
 q = c[b + 36 >> 2] | 0;
 k = bb << 1;
 r = La << 1;
 Xa = t << 1;
 w = da << 1;
 Fa = u << 1;
 p = db << 1;
 oa = j << 1;
 v = pa << 1;
 Wa = db * 38 | 0;
 Ja = j * 19 | 0;
 fa = pa * 38 | 0;
 X = g * 19 | 0;
 gb = q * 38 | 0;
 cb = ((bb | 0) < 0) << 31 >> 31;
 cb = Mb(bb | 0, cb | 0, bb | 0, cb | 0) | 0;
 bb = x;
 l = ((k | 0) < 0) << 31 >> 31;
 Ma = ((La | 0) < 0) << 31 >> 31;
 Ua = Mb(k | 0, l | 0, La | 0, Ma | 0) | 0;
 Ta = x;
 o = ((t | 0) < 0) << 31 >> 31;
 Oa = Mb(t | 0, o | 0, k | 0, l | 0) | 0;
 Na = x;
 ea = ((da | 0) < 0) << 31 >> 31;
 Ea = Mb(da | 0, ea | 0, k | 0, l | 0) | 0;
 Da = x;
 e = ((u | 0) < 0) << 31 >> 31;
 sa = Mb(u | 0, e | 0, k | 0, l | 0) | 0;
 ra = x;
 eb = ((db | 0) < 0) << 31 >> 31;
 ia = Mb(db | 0, eb | 0, k | 0, l | 0) | 0;
 ha = x;
 s = ((j | 0) < 0) << 31 >> 31;
 _ = Mb(j | 0, s | 0, k | 0, l | 0) | 0;
 Z = x;
 qa = ((pa | 0) < 0) << 31 >> 31;
 Q = Mb(pa | 0, qa | 0, k | 0, l | 0) | 0;
 P = x;
 h = ((g | 0) < 0) << 31 >> 31;
 G = Mb(g | 0, h | 0, k | 0, l | 0) | 0;
 F = x;
 b = ((q | 0) < 0) << 31 >> 31;
 l = Mb(q | 0, b | 0, k | 0, l | 0) | 0;
 k = x;
 d = ((r | 0) < 0) << 31 >> 31;
 Ma = Mb(r | 0, d | 0, La | 0, Ma | 0) | 0;
 La = x;
 Ca = Mb(r | 0, d | 0, t | 0, o | 0) | 0;
 Ba = x;
 f = ((w | 0) < 0) << 31 >> 31;
 wa = Mb(w | 0, f | 0, r | 0, d | 0) | 0;
 va = x;
 ma = Mb(u | 0, e | 0, r | 0, d | 0) | 0;
 la = x;
 y = ((p | 0) < 0) << 31 >> 31;
 aa = Mb(p | 0, y | 0, r | 0, d | 0) | 0;
 $ = x;
 S = Mb(j | 0, s | 0, r | 0, d | 0) | 0;
 R = x;
 i = ((v | 0) < 0) << 31 >> 31;
 I = Mb(v | 0, i | 0, r | 0, d | 0) | 0;
 H = x;
 m = Mb(g | 0, h | 0, r | 0, d | 0) | 0;
 n = x;
 fb = ((gb | 0) < 0) << 31 >> 31;
 d = Mb(gb | 0, fb | 0, r | 0, d | 0) | 0;
 r = x;
 ua = Mb(t | 0, o | 0, t | 0, o | 0) | 0;
 ta = x;
 Ya = ((Xa | 0) < 0) << 31 >> 31;
 ka = Mb(Xa | 0, Ya | 0, da | 0, ea | 0) | 0;
 ja = x;
 ca = Mb(u | 0, e | 0, Xa | 0, Ya | 0) | 0;
 ba = x;
 W = Mb(db | 0, eb | 0, Xa | 0, Ya | 0) | 0;
 V = x;
 O = Mb(j | 0, s | 0, Xa | 0, Ya | 0) | 0;
 N = x;
 A = Mb(pa | 0, qa | 0, Xa | 0, Ya | 0) | 0;
 z = x;
 Y = ((X | 0) < 0) << 31 >> 31;
 Ya = Mb(X | 0, Y | 0, Xa | 0, Ya | 0) | 0;
 Xa = x;
 o = Mb(gb | 0, fb | 0, t | 0, o | 0) | 0;
 t = x;
 ea = Mb(w | 0, f | 0, da | 0, ea | 0) | 0;
 da = x;
 U = Mb(w | 0, f | 0, u | 0, e | 0) | 0;
 T = x;
 K = Mb(p | 0, y | 0, w | 0, f | 0) | 0;
 J = x;
 E = Mb(j | 0, s | 0, w | 0, f | 0) | 0;
 D = x;
 ga = ((fa | 0) < 0) << 31 >> 31;
 _a = Mb(fa | 0, ga | 0, w | 0, f | 0) | 0;
 Za = x;
 Qa = Mb(X | 0, Y | 0, w | 0, f | 0) | 0;
 Pa = x;
 f = Mb(gb | 0, fb | 0, w | 0, f | 0) | 0;
 w = x;
 M = Mb(u | 0, e | 0, u | 0, e | 0) | 0;
 L = x;
 Ga = ((Fa | 0) < 0) << 31 >> 31;
 C = Mb(Fa | 0, Ga | 0, db | 0, eb | 0) | 0;
 B = x;
 Ka = ((Ja | 0) < 0) << 31 >> 31;
 ab = Mb(Ja | 0, Ka | 0, Fa | 0, Ga | 0) | 0;
 $a = x;
 Sa = Mb(fa | 0, ga | 0, u | 0, e | 0) | 0;
 Ra = x;
 Ga = Mb(X | 0, Y | 0, Fa | 0, Ga | 0) | 0;
 Fa = x;
 e = Mb(gb | 0, fb | 0, u | 0, e | 0) | 0;
 u = x;
 eb = Mb(Wa | 0, ((Wa | 0) < 0) << 31 >> 31 | 0, db | 0, eb | 0) | 0;
 db = x;
 Wa = Mb(Ja | 0, Ka | 0, p | 0, y | 0) | 0;
 Va = x;
 Ia = Mb(fa | 0, ga | 0, p | 0, y | 0) | 0;
 Ha = x;
 ya = Mb(X | 0, Y | 0, p | 0, y | 0) | 0;
 xa = x;
 y = Mb(gb | 0, fb | 0, p | 0, y | 0) | 0;
 p = x;
 Ka = Mb(Ja | 0, Ka | 0, j | 0, s | 0) | 0;
 Ja = x;
 Aa = Mb(fa | 0, ga | 0, j | 0, s | 0) | 0;
 za = x;
 oa = Mb(X | 0, Y | 0, oa | 0, ((oa | 0) < 0) << 31 >> 31 | 0) | 0;
 na = x;
 s = Mb(gb | 0, fb | 0, j | 0, s | 0) | 0;
 j = x;
 qa = Mb(fa | 0, ga | 0, pa | 0, qa | 0) | 0;
 pa = x;
 ga = Mb(X | 0, Y | 0, v | 0, i | 0) | 0;
 fa = x;
 i = Mb(gb | 0, fb | 0, v | 0, i | 0) | 0;
 v = x;
 Y = Mb(X | 0, Y | 0, g | 0, h | 0) | 0;
 X = x;
 h = Mb(gb | 0, fb | 0, g | 0, h | 0) | 0;
 g = x;
 b = Mb(gb | 0, fb | 0, q | 0, b | 0) | 0;
 q = x;
 bb = Qb(eb | 0, db | 0, cb | 0, bb | 0) | 0;
 $a = Qb(bb | 0, x | 0, ab | 0, $a | 0) | 0;
 Za = Qb($a | 0, x | 0, _a | 0, Za | 0) | 0;
 Xa = Qb(Za | 0, x | 0, Ya | 0, Xa | 0) | 0;
 r = Qb(Xa | 0, x | 0, d | 0, r | 0) | 0;
 d = x;
 Ta = Qb(Wa | 0, Va | 0, Ua | 0, Ta | 0) | 0;
 Ra = Qb(Ta | 0, x | 0, Sa | 0, Ra | 0) | 0;
 Pa = Qb(Ra | 0, x | 0, Qa | 0, Pa | 0) | 0;
 t = Qb(Pa | 0, x | 0, o | 0, t | 0) | 0;
 o = x;
 La = Qb(Oa | 0, Na | 0, Ma | 0, La | 0) | 0;
 Ja = Qb(La | 0, x | 0, Ka | 0, Ja | 0) | 0;
 Ha = Qb(Ja | 0, x | 0, Ia | 0, Ha | 0) | 0;
 Fa = Qb(Ha | 0, x | 0, Ga | 0, Fa | 0) | 0;
 w = Qb(Fa | 0, x | 0, f | 0, w | 0) | 0;
 f = x;
 Ba = Qb(Ea | 0, Da | 0, Ca | 0, Ba | 0) | 0;
 za = Qb(Ba | 0, x | 0, Aa | 0, za | 0) | 0;
 xa = Qb(za | 0, x | 0, ya | 0, xa | 0) | 0;
 u = Qb(xa | 0, x | 0, e | 0, u | 0) | 0;
 e = x;
 ta = Qb(wa | 0, va | 0, ua | 0, ta | 0) | 0;
 ra = Qb(ta | 0, x | 0, sa | 0, ra | 0) | 0;
 pa = Qb(ra | 0, x | 0, qa | 0, pa | 0) | 0;
 na = Qb(pa | 0, x | 0, oa | 0, na | 0) | 0;
 p = Qb(na | 0, x | 0, y | 0, p | 0) | 0;
 y = x;
 ja = Qb(ma | 0, la | 0, ka | 0, ja | 0) | 0;
 ha = Qb(ja | 0, x | 0, ia | 0, ha | 0) | 0;
 fa = Qb(ha | 0, x | 0, ga | 0, fa | 0) | 0;
 j = Qb(fa | 0, x | 0, s | 0, j | 0) | 0;
 s = x;
 ba = Qb(ea | 0, da | 0, ca | 0, ba | 0) | 0;
 $ = Qb(ba | 0, x | 0, aa | 0, $ | 0) | 0;
 Z = Qb($ | 0, x | 0, _ | 0, Z | 0) | 0;
 X = Qb(Z | 0, x | 0, Y | 0, X | 0) | 0;
 v = Qb(X | 0, x | 0, i | 0, v | 0) | 0;
 i = x;
 T = Qb(W | 0, V | 0, U | 0, T | 0) | 0;
 R = Qb(T | 0, x | 0, S | 0, R | 0) | 0;
 P = Qb(R | 0, x | 0, Q | 0, P | 0) | 0;
 g = Qb(P | 0, x | 0, h | 0, g | 0) | 0;
 h = x;
 L = Qb(O | 0, N | 0, M | 0, L | 0) | 0;
 J = Qb(L | 0, x | 0, K | 0, J | 0) | 0;
 H = Qb(J | 0, x | 0, I | 0, H | 0) | 0;
 F = Qb(H | 0, x | 0, G | 0, F | 0) | 0;
 q = Qb(F | 0, x | 0, b | 0, q | 0) | 0;
 b = x;
 B = Qb(E | 0, D | 0, C | 0, B | 0) | 0;
 z = Qb(B | 0, x | 0, A | 0, z | 0) | 0;
 n = Qb(z | 0, x | 0, m | 0, n | 0) | 0;
 k = Qb(n | 0, x | 0, l | 0, k | 0) | 0;
 l = x;
 d = Pb(r | 0, d | 0, 1) | 0;
 r = x;
 o = Pb(t | 0, o | 0, 1) | 0;
 t = x;
 f = Pb(w | 0, f | 0, 1) | 0;
 w = x;
 e = Pb(u | 0, e | 0, 1) | 0;
 u = x;
 y = Pb(p | 0, y | 0, 1) | 0;
 p = x;
 s = Pb(j | 0, s | 0, 1) | 0;
 j = x;
 i = Pb(v | 0, i | 0, 1) | 0;
 v = x;
 h = Pb(g | 0, h | 0, 1) | 0;
 g = x;
 b = Pb(q | 0, b | 0, 1) | 0;
 q = x;
 l = Pb(k | 0, l | 0, 1) | 0;
 k = x;
 n = Qb(d | 0, r | 0, 33554432, 0) | 0;
 m = x;
 z = Nb(n | 0, m | 0, 26) | 0;
 t = Qb(z | 0, x | 0, o | 0, t | 0) | 0;
 o = x;
 m = Rb(d | 0, r | 0, n & -67108864 | 0, m | 0) | 0;
 n = x;
 r = Qb(y | 0, p | 0, 33554432, 0) | 0;
 d = x;
 z = Nb(r | 0, d | 0, 26) | 0;
 j = Qb(z | 0, x | 0, s | 0, j | 0) | 0;
 s = x;
 d = Rb(y | 0, p | 0, r & -67108864 | 0, d | 0) | 0;
 r = x;
 p = Qb(t | 0, o | 0, 16777216, 0) | 0;
 y = Nb(p | 0, x | 0, 25) | 0;
 w = Qb(y | 0, x | 0, f | 0, w | 0) | 0;
 f = x;
 p = Rb(t | 0, o | 0, p & -33554432 | 0, 0) | 0;
 o = x;
 t = Qb(j | 0, s | 0, 16777216, 0) | 0;
 y = Nb(t | 0, x | 0, 25) | 0;
 v = Qb(y | 0, x | 0, i | 0, v | 0) | 0;
 i = x;
 t = Rb(j | 0, s | 0, t & -33554432 | 0, 0) | 0;
 s = x;
 j = Qb(w | 0, f | 0, 33554432, 0) | 0;
 y = Nb(j | 0, x | 0, 26) | 0;
 u = Qb(y | 0, x | 0, e | 0, u | 0) | 0;
 e = x;
 j = Rb(w | 0, f | 0, j & -67108864 | 0, 0) | 0;
 f = Qb(v | 0, i | 0, 33554432, 0) | 0;
 w = Nb(f | 0, x | 0, 26) | 0;
 g = Qb(w | 0, x | 0, h | 0, g | 0) | 0;
 h = x;
 f = Rb(v | 0, i | 0, f & -67108864 | 0, 0) | 0;
 i = Qb(u | 0, e | 0, 16777216, 0) | 0;
 v = Nb(i | 0, x | 0, 25) | 0;
 r = Qb(v | 0, x | 0, d | 0, r | 0) | 0;
 d = x;
 i = Rb(u | 0, e | 0, i & -33554432 | 0, 0) | 0;
 e = Qb(g | 0, h | 0, 16777216, 0) | 0;
 u = Nb(e | 0, x | 0, 25) | 0;
 q = Qb(u | 0, x | 0, b | 0, q | 0) | 0;
 b = x;
 e = Rb(g | 0, h | 0, e & -33554432 | 0, 0) | 0;
 h = Qb(r | 0, d | 0, 33554432, 0) | 0;
 g = Ob(h | 0, x | 0, 26) | 0;
 g = Qb(t | 0, s | 0, g | 0, x | 0) | 0;
 h = Rb(r | 0, d | 0, h & -67108864 | 0, 0) | 0;
 d = Qb(q | 0, b | 0, 33554432, 0) | 0;
 r = Nb(d | 0, x | 0, 26) | 0;
 k = Qb(r | 0, x | 0, l | 0, k | 0) | 0;
 l = x;
 d = Rb(q | 0, b | 0, d & -67108864 | 0, 0) | 0;
 b = Qb(k | 0, l | 0, 16777216, 0) | 0;
 q = Nb(b | 0, x | 0, 25) | 0;
 q = Mb(q | 0, x | 0, 19, 0) | 0;
 n = Qb(q | 0, x | 0, m | 0, n | 0) | 0;
 m = x;
 b = Rb(k | 0, l | 0, b & -33554432 | 0, 0) | 0;
 l = Qb(n | 0, m | 0, 33554432, 0) | 0;
 k = Ob(l | 0, x | 0, 26) | 0;
 k = Qb(p | 0, o | 0, k | 0, x | 0) | 0;
 l = Rb(n | 0, m | 0, l & -67108864 | 0, 0) | 0;
 c[a >> 2] = l;
 c[a + 4 >> 2] = k;
 c[a + 8 >> 2] = j;
 c[a + 12 >> 2] = i;
 c[a + 16 >> 2] = h;
 c[a + 20 >> 2] = g;
 c[a + 24 >> 2] = f;
 c[a + 28 >> 2] = e;
 c[a + 32 >> 2] = d;
 c[a + 36 >> 2] = b;
 return;
}

function Sa(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0, G = 0, H = 0, I = 0, J = 0, K = 0, L = 0, M = 0, N = 0, O = 0, P = 0, Q = 0, R = 0, S = 0, T = 0, U = 0, V = 0, W = 0, X = 0, Y = 0, Z = 0, _ = 0, $ = 0, aa = 0, ba = 0, ca = 0, da = 0, ea = 0, fa = 0, ga = 0, ha = 0, ia = 0, ja = 0, ka = 0, la = 0, ma = 0, na = 0, oa = 0, pa = 0, qa = 0, ra = 0, sa = 0, ta = 0, ua = 0, va = 0, wa = 0, xa = 0, ya = 0, za = 0, Aa = 0, Ba = 0, Ca = 0, Da = 0, Ea = 0, Fa = 0, Ga = 0, Ha = 0, Ia = 0, Ja = 0, Ka = 0, La = 0, Ma = 0, Na = 0, Oa = 0, Pa = 0, Qa = 0, Ra = 0, Sa = 0, Ta = 0, Ua = 0, Va = 0, Wa = 0, Xa = 0, Ya = 0, Za = 0, _a = 0, $a = 0, ab = 0, bb = 0, cb = 0, db = 0, eb = 0, fb = 0, gb = 0;
 bb = c[b >> 2] | 0;
 va = c[b + 4 >> 2] | 0;
 k = c[b + 8 >> 2] | 0;
 ma = c[b + 12 >> 2] | 0;
 g = c[b + 16 >> 2] | 0;
 db = c[b + 20 >> 2] | 0;
 h = c[b + 24 >> 2] | 0;
 o = c[b + 28 >> 2] | 0;
 P = c[b + 32 >> 2] | 0;
 D = c[b + 36 >> 2] | 0;
 r = bb << 1;
 d = va << 1;
 Xa = k << 1;
 i = ma << 1;
 oa = g << 1;
 f = db << 1;
 m = h << 1;
 e = o << 1;
 Ma = db * 38 | 0;
 sa = h * 19 | 0;
 xa = o * 38 | 0;
 ea = P * 19 | 0;
 gb = D * 38 | 0;
 cb = ((bb | 0) < 0) << 31 >> 31;
 cb = Mb(bb | 0, cb | 0, bb | 0, cb | 0) | 0;
 bb = x;
 s = ((r | 0) < 0) << 31 >> 31;
 ua = ((va | 0) < 0) << 31 >> 31;
 Ka = Mb(r | 0, s | 0, va | 0, ua | 0) | 0;
 Ja = x;
 j = ((k | 0) < 0) << 31 >> 31;
 Wa = Mb(k | 0, j | 0, r | 0, s | 0) | 0;
 Va = x;
 na = ((ma | 0) < 0) << 31 >> 31;
 Ua = Mb(ma | 0, na | 0, r | 0, s | 0) | 0;
 Ta = x;
 Z = ((g | 0) < 0) << 31 >> 31;
 Oa = Mb(g | 0, Z | 0, r | 0, s | 0) | 0;
 Na = x;
 eb = ((db | 0) < 0) << 31 >> 31;
 Aa = Mb(db | 0, eb | 0, r | 0, s | 0) | 0;
 za = x;
 wa = ((h | 0) < 0) << 31 >> 31;
 ha = Mb(h | 0, wa | 0, r | 0, s | 0) | 0;
 ga = x;
 C = ((o | 0) < 0) << 31 >> 31;
 S = Mb(o | 0, C | 0, r | 0, s | 0) | 0;
 R = x;
 Q = ((P | 0) < 0) << 31 >> 31;
 G = Mb(P | 0, Q | 0, r | 0, s | 0) | 0;
 F = x;
 E = ((D | 0) < 0) << 31 >> 31;
 s = Mb(D | 0, E | 0, r | 0, s | 0) | 0;
 r = x;
 l = ((d | 0) < 0) << 31 >> 31;
 ua = Mb(d | 0, l | 0, va | 0, ua | 0) | 0;
 va = x;
 ca = Mb(d | 0, l | 0, k | 0, j | 0) | 0;
 da = x;
 q = ((i | 0) < 0) << 31 >> 31;
 Sa = Mb(i | 0, q | 0, d | 0, l | 0) | 0;
 Ra = x;
 Ea = Mb(g | 0, Z | 0, d | 0, l | 0) | 0;
 Da = x;
 p = ((f | 0) < 0) << 31 >> 31;
 ja = Mb(f | 0, p | 0, d | 0, l | 0) | 0;
 ia = x;
 U = Mb(h | 0, wa | 0, d | 0, l | 0) | 0;
 T = x;
 b = ((e | 0) < 0) << 31 >> 31;
 I = Mb(e | 0, b | 0, d | 0, l | 0) | 0;
 H = x;
 u = Mb(P | 0, Q | 0, d | 0, l | 0) | 0;
 t = x;
 fb = ((gb | 0) < 0) << 31 >> 31;
 l = Mb(gb | 0, fb | 0, d | 0, l | 0) | 0;
 d = x;
 Qa = Mb(k | 0, j | 0, k | 0, j | 0) | 0;
 Pa = x;
 Ya = ((Xa | 0) < 0) << 31 >> 31;
 Ca = Mb(Xa | 0, Ya | 0, ma | 0, na | 0) | 0;
 Ba = x;
 la = Mb(g | 0, Z | 0, Xa | 0, Ya | 0) | 0;
 ka = x;
 Y = Mb(db | 0, eb | 0, Xa | 0, Ya | 0) | 0;
 X = x;
 O = Mb(h | 0, wa | 0, Xa | 0, Ya | 0) | 0;
 N = x;
 w = Mb(o | 0, C | 0, Xa | 0, Ya | 0) | 0;
 v = x;
 fa = ((ea | 0) < 0) << 31 >> 31;
 Ya = Mb(ea | 0, fa | 0, Xa | 0, Ya | 0) | 0;
 Xa = x;
 j = Mb(gb | 0, fb | 0, k | 0, j | 0) | 0;
 k = x;
 na = Mb(i | 0, q | 0, ma | 0, na | 0) | 0;
 ma = x;
 W = Mb(i | 0, q | 0, g | 0, Z | 0) | 0;
 V = x;
 K = Mb(f | 0, p | 0, i | 0, q | 0) | 0;
 J = x;
 B = Mb(h | 0, wa | 0, i | 0, q | 0) | 0;
 A = x;
 ya = ((xa | 0) < 0) << 31 >> 31;
 _a = Mb(xa | 0, ya | 0, i | 0, q | 0) | 0;
 Za = x;
 Ga = Mb(ea | 0, fa | 0, i | 0, q | 0) | 0;
 Fa = x;
 q = Mb(gb | 0, fb | 0, i | 0, q | 0) | 0;
 i = x;
 M = Mb(g | 0, Z | 0, g | 0, Z | 0) | 0;
 L = x;
 pa = ((oa | 0) < 0) << 31 >> 31;
 z = Mb(oa | 0, pa | 0, db | 0, eb | 0) | 0;
 y = x;
 ta = ((sa | 0) < 0) << 31 >> 31;
 ab = Mb(sa | 0, ta | 0, oa | 0, pa | 0) | 0;
 $a = x;
 Ia = Mb(xa | 0, ya | 0, g | 0, Z | 0) | 0;
 Ha = x;
 pa = Mb(ea | 0, fa | 0, oa | 0, pa | 0) | 0;
 oa = x;
 Z = Mb(gb | 0, fb | 0, g | 0, Z | 0) | 0;
 g = x;
 eb = Mb(Ma | 0, ((Ma | 0) < 0) << 31 >> 31 | 0, db | 0, eb | 0) | 0;
 db = x;
 Ma = Mb(sa | 0, ta | 0, f | 0, p | 0) | 0;
 La = x;
 ra = Mb(xa | 0, ya | 0, f | 0, p | 0) | 0;
 qa = x;
 $ = Mb(ea | 0, fa | 0, f | 0, p | 0) | 0;
 _ = x;
 p = Mb(gb | 0, fb | 0, f | 0, p | 0) | 0;
 f = x;
 ta = Mb(sa | 0, ta | 0, h | 0, wa | 0) | 0;
 sa = x;
 ba = Mb(xa | 0, ya | 0, h | 0, wa | 0) | 0;
 aa = x;
 m = Mb(ea | 0, fa | 0, m | 0, ((m | 0) < 0) << 31 >> 31 | 0) | 0;
 n = x;
 wa = Mb(gb | 0, fb | 0, h | 0, wa | 0) | 0;
 h = x;
 C = Mb(xa | 0, ya | 0, o | 0, C | 0) | 0;
 o = x;
 ya = Mb(ea | 0, fa | 0, e | 0, b | 0) | 0;
 xa = x;
 b = Mb(gb | 0, fb | 0, e | 0, b | 0) | 0;
 e = x;
 fa = Mb(ea | 0, fa | 0, P | 0, Q | 0) | 0;
 ea = x;
 Q = Mb(gb | 0, fb | 0, P | 0, Q | 0) | 0;
 P = x;
 E = Mb(gb | 0, fb | 0, D | 0, E | 0) | 0;
 D = x;
 bb = Qb(eb | 0, db | 0, cb | 0, bb | 0) | 0;
 $a = Qb(bb | 0, x | 0, ab | 0, $a | 0) | 0;
 Za = Qb($a | 0, x | 0, _a | 0, Za | 0) | 0;
 Xa = Qb(Za | 0, x | 0, Ya | 0, Xa | 0) | 0;
 d = Qb(Xa | 0, x | 0, l | 0, d | 0) | 0;
 l = x;
 va = Qb(Wa | 0, Va | 0, ua | 0, va | 0) | 0;
 ua = x;
 da = Qb(Ua | 0, Ta | 0, ca | 0, da | 0) | 0;
 ca = x;
 Pa = Qb(Sa | 0, Ra | 0, Qa | 0, Pa | 0) | 0;
 Na = Qb(Pa | 0, x | 0, Oa | 0, Na | 0) | 0;
 o = Qb(Na | 0, x | 0, C | 0, o | 0) | 0;
 n = Qb(o | 0, x | 0, m | 0, n | 0) | 0;
 f = Qb(n | 0, x | 0, p | 0, f | 0) | 0;
 p = x;
 n = Qb(d | 0, l | 0, 33554432, 0) | 0;
 m = x;
 o = Nb(n | 0, m | 0, 26) | 0;
 C = x;
 Ja = Qb(Ma | 0, La | 0, Ka | 0, Ja | 0) | 0;
 Ha = Qb(Ja | 0, x | 0, Ia | 0, Ha | 0) | 0;
 Fa = Qb(Ha | 0, x | 0, Ga | 0, Fa | 0) | 0;
 k = Qb(Fa | 0, x | 0, j | 0, k | 0) | 0;
 C = Qb(k | 0, x | 0, o | 0, C | 0) | 0;
 o = x;
 m = Rb(d | 0, l | 0, n & -67108864 | 0, m | 0) | 0;
 n = x;
 l = Qb(f | 0, p | 0, 33554432, 0) | 0;
 d = x;
 k = Nb(l | 0, d | 0, 26) | 0;
 j = x;
 Ba = Qb(Ea | 0, Da | 0, Ca | 0, Ba | 0) | 0;
 za = Qb(Ba | 0, x | 0, Aa | 0, za | 0) | 0;
 xa = Qb(za | 0, x | 0, ya | 0, xa | 0) | 0;
 h = Qb(xa | 0, x | 0, wa | 0, h | 0) | 0;
 j = Qb(h | 0, x | 0, k | 0, j | 0) | 0;
 k = x;
 d = Rb(f | 0, p | 0, l & -67108864 | 0, d | 0) | 0;
 l = x;
 p = Qb(C | 0, o | 0, 16777216, 0) | 0;
 f = Nb(p | 0, x | 0, 25) | 0;
 h = x;
 sa = Qb(va | 0, ua | 0, ta | 0, sa | 0) | 0;
 qa = Qb(sa | 0, x | 0, ra | 0, qa | 0) | 0;
 oa = Qb(qa | 0, x | 0, pa | 0, oa | 0) | 0;
 i = Qb(oa | 0, x | 0, q | 0, i | 0) | 0;
 h = Qb(i | 0, x | 0, f | 0, h | 0) | 0;
 f = x;
 p = Rb(C | 0, o | 0, p & -33554432 | 0, 0) | 0;
 o = x;
 C = Qb(j | 0, k | 0, 16777216, 0) | 0;
 i = Nb(C | 0, x | 0, 25) | 0;
 q = x;
 ka = Qb(na | 0, ma | 0, la | 0, ka | 0) | 0;
 ia = Qb(ka | 0, x | 0, ja | 0, ia | 0) | 0;
 ga = Qb(ia | 0, x | 0, ha | 0, ga | 0) | 0;
 ea = Qb(ga | 0, x | 0, fa | 0, ea | 0) | 0;
 e = Qb(ea | 0, x | 0, b | 0, e | 0) | 0;
 q = Qb(e | 0, x | 0, i | 0, q | 0) | 0;
 i = x;
 C = Rb(j | 0, k | 0, C & -33554432 | 0, 0) | 0;
 k = x;
 j = Qb(h | 0, f | 0, 33554432, 0) | 0;
 e = Nb(j | 0, x | 0, 26) | 0;
 b = x;
 aa = Qb(da | 0, ca | 0, ba | 0, aa | 0) | 0;
 _ = Qb(aa | 0, x | 0, $ | 0, _ | 0) | 0;
 g = Qb(_ | 0, x | 0, Z | 0, g | 0) | 0;
 b = Qb(g | 0, x | 0, e | 0, b | 0) | 0;
 e = x;
 j = Rb(h | 0, f | 0, j & -67108864 | 0, 0) | 0;
 f = Qb(q | 0, i | 0, 33554432, 0) | 0;
 h = Nb(f | 0, x | 0, 26) | 0;
 g = x;
 V = Qb(Y | 0, X | 0, W | 0, V | 0) | 0;
 T = Qb(V | 0, x | 0, U | 0, T | 0) | 0;
 R = Qb(T | 0, x | 0, S | 0, R | 0) | 0;
 P = Qb(R | 0, x | 0, Q | 0, P | 0) | 0;
 g = Qb(P | 0, x | 0, h | 0, g | 0) | 0;
 h = x;
 f = Rb(q | 0, i | 0, f & -67108864 | 0, 0) | 0;
 i = Qb(b | 0, e | 0, 16777216, 0) | 0;
 q = Nb(i | 0, x | 0, 25) | 0;
 l = Qb(q | 0, x | 0, d | 0, l | 0) | 0;
 d = x;
 i = Rb(b | 0, e | 0, i & -33554432 | 0, 0) | 0;
 e = Qb(g | 0, h | 0, 16777216, 0) | 0;
 b = Nb(e | 0, x | 0, 25) | 0;
 q = x;
 L = Qb(O | 0, N | 0, M | 0, L | 0) | 0;
 J = Qb(L | 0, x | 0, K | 0, J | 0) | 0;
 H = Qb(J | 0, x | 0, I | 0, H | 0) | 0;
 F = Qb(H | 0, x | 0, G | 0, F | 0) | 0;
 D = Qb(F | 0, x | 0, E | 0, D | 0) | 0;
 q = Qb(D | 0, x | 0, b | 0, q | 0) | 0;
 b = x;
 e = Rb(g | 0, h | 0, e & -33554432 | 0, 0) | 0;
 h = Qb(l | 0, d | 0, 33554432, 0) | 0;
 g = Ob(h | 0, x | 0, 26) | 0;
 g = Qb(C | 0, k | 0, g | 0, x | 0) | 0;
 h = Rb(l | 0, d | 0, h & -67108864 | 0, 0) | 0;
 d = Qb(q | 0, b | 0, 33554432, 0) | 0;
 l = Nb(d | 0, x | 0, 26) | 0;
 k = x;
 y = Qb(B | 0, A | 0, z | 0, y | 0) | 0;
 v = Qb(y | 0, x | 0, w | 0, v | 0) | 0;
 t = Qb(v | 0, x | 0, u | 0, t | 0) | 0;
 r = Qb(t | 0, x | 0, s | 0, r | 0) | 0;
 k = Qb(r | 0, x | 0, l | 0, k | 0) | 0;
 l = x;
 d = Rb(q | 0, b | 0, d & -67108864 | 0, 0) | 0;
 b = Qb(k | 0, l | 0, 16777216, 0) | 0;
 q = Nb(b | 0, x | 0, 25) | 0;
 q = Mb(q | 0, x | 0, 19, 0) | 0;
 n = Qb(q | 0, x | 0, m | 0, n | 0) | 0;
 m = x;
 b = Rb(k | 0, l | 0, b & -33554432 | 0, 0) | 0;
 l = Qb(n | 0, m | 0, 33554432, 0) | 0;
 k = Ob(l | 0, x | 0, 26) | 0;
 k = Qb(p | 0, o | 0, k | 0, x | 0) | 0;
 l = Rb(n | 0, m | 0, l & -67108864 | 0, 0) | 0;
 c[a >> 2] = l;
 c[a + 4 >> 2] = k;
 c[a + 8 >> 2] = j;
 c[a + 12 >> 2] = i;
 c[a + 16 >> 2] = h;
 c[a + 20 >> 2] = g;
 c[a + 24 >> 2] = f;
 c[a + 28 >> 2] = e;
 c[a + 32 >> 2] = d;
 c[a + 36 >> 2] = b;
 return;
}

function Ib(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0;
 if (!a) return;
 d = a + -8 | 0;
 f = c[8148] | 0;
 a = c[a + -4 >> 2] | 0;
 b = a & -8;
 j = d + b | 0;
 do if (!(a & 1)) {
  e = c[d >> 2] | 0;
  if (!(a & 3)) return;
  h = d + (0 - e) | 0;
  g = e + b | 0;
  if (h >>> 0 < f >>> 0) return;
  if ((c[8149] | 0) == (h | 0)) {
   a = j + 4 | 0;
   b = c[a >> 2] | 0;
   if ((b & 3 | 0) != 3) {
    i = h;
    b = g;
    break;
   }
   c[8146] = g;
   c[a >> 2] = b & -2;
   c[h + 4 >> 2] = g | 1;
   c[h + g >> 2] = g;
   return;
  }
  d = e >>> 3;
  if (e >>> 0 < 256) {
   a = c[h + 8 >> 2] | 0;
   b = c[h + 12 >> 2] | 0;
   if ((b | 0) == (a | 0)) {
    c[8144] = c[8144] & ~(1 << d);
    i = h;
    b = g;
    break;
   } else {
    c[a + 12 >> 2] = b;
    c[b + 8 >> 2] = a;
    i = h;
    b = g;
    break;
   }
  }
  f = c[h + 24 >> 2] | 0;
  a = c[h + 12 >> 2] | 0;
  do if ((a | 0) == (h | 0)) {
   b = h + 16 | 0;
   d = b + 4 | 0;
   a = c[d >> 2] | 0;
   if (!a) {
    a = c[b >> 2] | 0;
    if (!a) {
     a = 0;
     break;
    }
   } else b = d;
   while (1) {
    e = a + 20 | 0;
    d = c[e >> 2] | 0;
    if (!d) {
     e = a + 16 | 0;
     d = c[e >> 2] | 0;
     if (!d) break; else {
      a = d;
      b = e;
     }
    } else {
     a = d;
     b = e;
    }
   }
   c[b >> 2] = 0;
  } else {
   i = c[h + 8 >> 2] | 0;
   c[i + 12 >> 2] = a;
   c[a + 8 >> 2] = i;
  } while (0);
  if (!f) {
   i = h;
   b = g;
  } else {
   b = c[h + 28 >> 2] | 0;
   d = 32880 + (b << 2) | 0;
   if ((c[d >> 2] | 0) == (h | 0)) {
    c[d >> 2] = a;
    if (!a) {
     c[8145] = c[8145] & ~(1 << b);
     i = h;
     b = g;
     break;
    }
   } else {
    i = f + 16 | 0;
    c[((c[i >> 2] | 0) == (h | 0) ? i : f + 20 | 0) >> 2] = a;
    if (!a) {
     i = h;
     b = g;
     break;
    }
   }
   c[a + 24 >> 2] = f;
   b = h + 16 | 0;
   d = c[b >> 2] | 0;
   if (d | 0) {
    c[a + 16 >> 2] = d;
    c[d + 24 >> 2] = a;
   }
   b = c[b + 4 >> 2] | 0;
   if (!b) {
    i = h;
    b = g;
   } else {
    c[a + 20 >> 2] = b;
    c[b + 24 >> 2] = a;
    i = h;
    b = g;
   }
  }
 } else {
  i = d;
  h = d;
 } while (0);
 if (h >>> 0 >= j >>> 0) return;
 a = j + 4 | 0;
 e = c[a >> 2] | 0;
 if (!(e & 1)) return;
 if (!(e & 2)) {
  if ((c[8150] | 0) == (j | 0)) {
   j = (c[8147] | 0) + b | 0;
   c[8147] = j;
   c[8150] = i;
   c[i + 4 >> 2] = j | 1;
   if ((i | 0) != (c[8149] | 0)) return;
   c[8149] = 0;
   c[8146] = 0;
   return;
  }
  if ((c[8149] | 0) == (j | 0)) {
   j = (c[8146] | 0) + b | 0;
   c[8146] = j;
   c[8149] = h;
   c[i + 4 >> 2] = j | 1;
   c[h + j >> 2] = j;
   return;
  }
  f = (e & -8) + b | 0;
  d = e >>> 3;
  do if (e >>> 0 < 256) {
   b = c[j + 8 >> 2] | 0;
   a = c[j + 12 >> 2] | 0;
   if ((a | 0) == (b | 0)) {
    c[8144] = c[8144] & ~(1 << d);
    break;
   } else {
    c[b + 12 >> 2] = a;
    c[a + 8 >> 2] = b;
    break;
   }
  } else {
   g = c[j + 24 >> 2] | 0;
   a = c[j + 12 >> 2] | 0;
   do if ((a | 0) == (j | 0)) {
    b = j + 16 | 0;
    d = b + 4 | 0;
    a = c[d >> 2] | 0;
    if (!a) {
     a = c[b >> 2] | 0;
     if (!a) {
      d = 0;
      break;
     }
    } else b = d;
    while (1) {
     e = a + 20 | 0;
     d = c[e >> 2] | 0;
     if (!d) {
      e = a + 16 | 0;
      d = c[e >> 2] | 0;
      if (!d) break; else {
       a = d;
       b = e;
      }
     } else {
      a = d;
      b = e;
     }
    }
    c[b >> 2] = 0;
    d = a;
   } else {
    d = c[j + 8 >> 2] | 0;
    c[d + 12 >> 2] = a;
    c[a + 8 >> 2] = d;
    d = a;
   } while (0);
   if (g | 0) {
    a = c[j + 28 >> 2] | 0;
    b = 32880 + (a << 2) | 0;
    if ((c[b >> 2] | 0) == (j | 0)) {
     c[b >> 2] = d;
     if (!d) {
      c[8145] = c[8145] & ~(1 << a);
      break;
     }
    } else {
     e = g + 16 | 0;
     c[((c[e >> 2] | 0) == (j | 0) ? e : g + 20 | 0) >> 2] = d;
     if (!d) break;
    }
    c[d + 24 >> 2] = g;
    a = j + 16 | 0;
    b = c[a >> 2] | 0;
    if (b | 0) {
     c[d + 16 >> 2] = b;
     c[b + 24 >> 2] = d;
    }
    a = c[a + 4 >> 2] | 0;
    if (a | 0) {
     c[d + 20 >> 2] = a;
     c[a + 24 >> 2] = d;
    }
   }
  } while (0);
  c[i + 4 >> 2] = f | 1;
  c[h + f >> 2] = f;
  if ((i | 0) == (c[8149] | 0)) {
   c[8146] = f;
   return;
  }
 } else {
  c[a >> 2] = e & -2;
  c[i + 4 >> 2] = b | 1;
  c[h + b >> 2] = b;
  f = b;
 }
 a = f >>> 3;
 if (f >>> 0 < 256) {
  d = 32616 + (a << 1 << 2) | 0;
  b = c[8144] | 0;
  a = 1 << a;
  if (!(b & a)) {
   c[8144] = b | a;
   a = d;
   b = d + 8 | 0;
  } else {
   b = d + 8 | 0;
   a = c[b >> 2] | 0;
  }
  c[b >> 2] = i;
  c[a + 12 >> 2] = i;
  c[i + 8 >> 2] = a;
  c[i + 12 >> 2] = d;
  return;
 }
 a = f >>> 8;
 if (!a) e = 0; else if (f >>> 0 > 16777215) e = 31; else {
  h = (a + 1048320 | 0) >>> 16 & 8;
  j = a << h;
  g = (j + 520192 | 0) >>> 16 & 4;
  j = j << g;
  e = (j + 245760 | 0) >>> 16 & 2;
  e = 14 - (g | h | e) + (j << e >>> 15) | 0;
  e = f >>> (e + 7 | 0) & 1 | e << 1;
 }
 a = 32880 + (e << 2) | 0;
 c[i + 28 >> 2] = e;
 c[i + 20 >> 2] = 0;
 c[i + 16 >> 2] = 0;
 b = c[8145] | 0;
 d = 1 << e;
 a : do if (!(b & d)) {
  c[8145] = b | d;
  c[a >> 2] = i;
  c[i + 24 >> 2] = a;
  c[i + 12 >> 2] = i;
  c[i + 8 >> 2] = i;
 } else {
  a = c[a >> 2] | 0;
  b : do if ((c[a + 4 >> 2] & -8 | 0) != (f | 0)) {
   e = f << ((e | 0) == 31 ? 0 : 25 - (e >>> 1) | 0);
   while (1) {
    d = a + 16 + (e >>> 31 << 2) | 0;
    b = c[d >> 2] | 0;
    if (!b) break;
    if ((c[b + 4 >> 2] & -8 | 0) == (f | 0)) {
     a = b;
     break b;
    } else {
     e = e << 1;
     a = b;
    }
   }
   c[d >> 2] = i;
   c[i + 24 >> 2] = a;
   c[i + 12 >> 2] = i;
   c[i + 8 >> 2] = i;
   break a;
  } while (0);
  h = a + 8 | 0;
  j = c[h >> 2] | 0;
  c[j + 12 >> 2] = i;
  c[h >> 2] = i;
  c[i + 8 >> 2] = j;
  c[i + 12 >> 2] = a;
  c[i + 24 >> 2] = 0;
 } while (0);
 j = (c[8152] | 0) + -1 | 0;
 c[8152] = j;
 if (j | 0) return;
 a = 33032;
 while (1) {
  a = c[a >> 2] | 0;
  if (!a) break; else a = a + 8 | 0;
 }
 c[8152] = -1;
 return;
}

function pa(b, d) {
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0;
 x = c[d >> 2] | 0;
 w = x >> 31 & x;
 m = (w >> 26) + (c[d + 8 >> 2] | 0) | 0;
 v = m >> 31 & m;
 k = (v >> 25) + (c[d + 16 >> 2] | 0) | 0;
 u = k >> 31 & k;
 j = (u >> 26) + (c[d + 24 >> 2] | 0) | 0;
 t = j >> 31 & j;
 i = (t >> 25) + (c[d + 32 >> 2] | 0) | 0;
 s = i >> 31 & i;
 h = (s >> 26) + (c[d + 40 >> 2] | 0) | 0;
 r = h >> 31 & h;
 g = (r >> 25) + (c[d + 48 >> 2] | 0) | 0;
 q = g >> 31 & g;
 f = (q >> 26) + (c[d + 56 >> 2] | 0) | 0;
 p = f >> 31 & f;
 o = (p >> 25) + (c[d + 64 >> 2] | 0) | 0;
 e = o >> 31 & o;
 n = (e >> 26) + (c[d + 72 >> 2] | 0) | 0;
 l = n >> 31 & n;
 w = ((l >> 25) * 19 | 0) + (x - (w & -67108864)) | 0;
 d = w >> 31 & w;
 v = m - (v & -33554432) + (d >> 26) | 0;
 m = v >> 31 & v;
 u = k - (u & -67108864) + (m >> 25) | 0;
 k = u >> 31 & u;
 t = j - (t & -33554432) + (k >> 26) | 0;
 j = t >> 31 & t;
 s = i - (s & -67108864) + (j >> 25) | 0;
 i = s >> 31 & s;
 r = h - (r & -33554432) + (i >> 26) | 0;
 h = r >> 31 & r;
 q = g - (q & -67108864) + (h >> 25) | 0;
 g = q >> 31 & q;
 p = f - (p & -33554432) + (g >> 26) | 0;
 f = p >> 31 & p;
 e = o - (e & -67108864) + (f >> 25) | 0;
 o = e >> 31 & e;
 l = n - (l & -33554432) + (o >> 26) | 0;
 n = l >> 31 & l;
 d = ((n >> 25) * 19 | 0) + (w - (d & -67108864)) | 0;
 w = d >> 31 & d;
 d = d - (w & -67108864) | 0;
 m = (w >> 26) + (v - (m & -33554432)) + (d >> 26) | 0;
 k = u - (k & -67108864) + (m >> 25) | 0;
 j = t - (j & -33554432) + (k >> 26) | 0;
 i = s - (i & -67108864) + (j >> 25) | 0;
 h = r - (h & -33554432) + (i >> 26) | 0;
 g = q - (g & -67108864) + (h >> 25) | 0;
 f = p - (f & -33554432) + (g >> 26) | 0;
 o = e - (o & -67108864) + (f >> 25) | 0;
 n = l - (n & -33554432) + (o >> 26) | 0;
 d = (d & 67108863) + ((n >> 25) * 19 | 0) | 0;
 m = (m & 33554431) + (d >> 26) | 0;
 l = m & 33554431;
 m = (k & 67108863) + (m >> 25) | 0;
 k = m & 67108863;
 m = (j & 33554431) + (m >> 26) | 0;
 j = m & 33554431;
 m = (i & 67108863) + (m >> 25) | 0;
 i = m & 67108863;
 m = (h & 33554431) + (m >> 26) | 0;
 h = m & 33554431;
 m = (g & 67108863) + (m >> 25) | 0;
 g = m & 67108863;
 m = (f & 33554431) + (m >> 26) | 0;
 f = m & 33554431;
 m = (o & 67108863) + (m >> 25) | 0;
 o = m & 67108863;
 m = (n & 33554431) + (m >> 26) | 0;
 n = m & 33554431;
 m = (d & 67108863) + ((m >> 25) * 19 | 0) | 0;
 d = qa(m) | 0;
 d = (ra(l, 33554431) | 0) & d;
 d = (ra(k, 67108863) | 0) & d;
 d = (ra(j, 33554431) | 0) & d;
 d = (ra(i, 67108863) | 0) & d;
 d = (ra(h, 33554431) | 0) & d;
 d = (ra(g, 67108863) | 0) & d;
 d = (ra(f, 33554431) | 0) & d;
 d = (ra(o, 67108863) | 0) & d;
 d = (ra(n, 33554431) | 0) & d;
 m = m - (d & 67108845) | 0;
 e = d & 67108863;
 d = d & 33554431;
 l = l - d | 0;
 k = k - e | 0;
 j = j - d | 0;
 i = i - e | 0;
 h = h - d | 0;
 g = g - e | 0;
 f = f - d | 0;
 e = o - e | 0;
 d = n - d | 0;
 a[b >> 0] = m;
 a[b + 1 >> 0] = m >>> 8;
 a[b + 2 >> 0] = m >>> 16;
 a[b + 3 >> 0] = m >>> 24 | l << 2;
 a[b + 4 >> 0] = l >>> 6;
 a[b + 5 >> 0] = l >>> 14;
 a[b + 6 >> 0] = k << 3 | l >>> 22;
 a[b + 7 >> 0] = k >>> 5;
 a[b + 8 >> 0] = k >>> 13;
 a[b + 9 >> 0] = j << 5 | k >>> 21;
 a[b + 10 >> 0] = j >>> 3;
 a[b + 11 >> 0] = j >>> 11;
 a[b + 12 >> 0] = i << 6 | j >>> 19;
 a[b + 13 >> 0] = i >>> 2;
 a[b + 14 >> 0] = i >>> 10;
 a[b + 15 >> 0] = i >>> 18;
 a[b + 16 >> 0] = h;
 a[b + 17 >> 0] = h >>> 8;
 a[b + 18 >> 0] = h >>> 16;
 a[b + 19 >> 0] = h >>> 24 | g << 1;
 a[b + 20 >> 0] = g >>> 7;
 a[b + 21 >> 0] = g >>> 15;
 a[b + 22 >> 0] = f << 3 | g >>> 23;
 a[b + 23 >> 0] = f >>> 5;
 a[b + 24 >> 0] = f >>> 13;
 a[b + 25 >> 0] = e << 4 | f >>> 21;
 a[b + 26 >> 0] = e >>> 4;
 a[b + 27 >> 0] = e >>> 12;
 a[b + 28 >> 0] = d << 6 | e >>> 20;
 a[b + 29 >> 0] = d >>> 2;
 a[b + 30 >> 0] = d >>> 10;
 a[b + 31 >> 0] = d >>> 18;
 return;
}

function Ya(b, c) {
 b = b | 0;
 c = c | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
 e = 0;
 do {
  a[b + e >> 0] = (d[c + (e >>> 3) >> 0] | 0) >>> (e & 7) & 1;
  e = e + 1 | 0;
 } while ((e | 0) != 256);
 k = 0;
 do {
  j = b + k | 0;
  e = a[j >> 0] | 0;
  i = k;
  k = k + 1 | 0;
  a : do if (e << 24 >> 24 != 0 & k >>> 0 < 256) {
   g = b + k | 0;
   c = a[g >> 0] | 0;
   b : do if (c << 24 >> 24) {
    f = e << 24 >> 24;
    e = c << 24 >> 24 << 1;
    c = e + f | 0;
    if ((c | 0) < 16) {
     a[j >> 0] = c;
     a[g >> 0] = 0;
     break;
    }
    e = f - e | 0;
    if ((e | 0) <= -16) break a;
    a[j >> 0] = e;
    e = k;
    while (1) {
     c = b + e | 0;
     if (!(a[c >> 0] | 0)) break;
     a[c >> 0] = 0;
     if (e >>> 0 < 255) e = e + 1 | 0; else break b;
    }
    a[c >> 0] = 1;
   } while (0);
   e = i + 2 | 0;
   if (e >>> 0 < 256) {
    g = b + e | 0;
    c = a[g >> 0] | 0;
    c : do if (c << 24 >> 24) {
     h = a[j >> 0] | 0;
     c = c << 24 >> 24 << 2;
     f = c + h | 0;
     if ((f | 0) < 16) {
      a[j >> 0] = f;
      a[g >> 0] = 0;
      break;
     }
     c = h - c | 0;
     if ((c | 0) <= -16) break a;
     a[j >> 0] = c;
     while (1) {
      c = b + e | 0;
      if (!(a[c >> 0] | 0)) break;
      a[c >> 0] = 0;
      if (e >>> 0 < 255) e = e + 1 | 0; else break c;
     }
     a[c >> 0] = 1;
    } while (0);
    e = i + 3 | 0;
    if (e >>> 0 < 256) {
     g = b + e | 0;
     c = a[g >> 0] | 0;
     d : do if (c << 24 >> 24) {
      h = a[j >> 0] | 0;
      c = c << 24 >> 24 << 3;
      f = c + h | 0;
      if ((f | 0) < 16) {
       a[j >> 0] = f;
       a[g >> 0] = 0;
       break;
      }
      c = h - c | 0;
      if ((c | 0) <= -16) break a;
      a[j >> 0] = c;
      while (1) {
       c = b + e | 0;
       if (!(a[c >> 0] | 0)) break;
       a[c >> 0] = 0;
       if (e >>> 0 < 255) e = e + 1 | 0; else break d;
      }
      a[c >> 0] = 1;
     } while (0);
     e = i + 4 | 0;
     if (e >>> 0 < 256) {
      g = b + e | 0;
      c = a[g >> 0] | 0;
      e : do if (c << 24 >> 24) {
       h = a[j >> 0] | 0;
       c = c << 24 >> 24 << 4;
       f = c + h | 0;
       if ((f | 0) < 16) {
        a[j >> 0] = f;
        a[g >> 0] = 0;
        break;
       }
       c = h - c | 0;
       if ((c | 0) <= -16) break a;
       a[j >> 0] = c;
       while (1) {
        c = b + e | 0;
        if (!(a[c >> 0] | 0)) break;
        a[c >> 0] = 0;
        if (e >>> 0 < 255) e = e + 1 | 0; else break e;
       }
       a[c >> 0] = 1;
      } while (0);
      e = i + 5 | 0;
      if (e >>> 0 < 256) {
       g = b + e | 0;
       c = a[g >> 0] | 0;
       f : do if (c << 24 >> 24) {
        h = a[j >> 0] | 0;
        c = c << 24 >> 24 << 5;
        f = c + h | 0;
        if ((f | 0) < 16) {
         a[j >> 0] = f;
         a[g >> 0] = 0;
         break;
        }
        c = h - c | 0;
        if ((c | 0) <= -16) break a;
        a[j >> 0] = c;
        while (1) {
         c = b + e | 0;
         if (!(a[c >> 0] | 0)) break;
         a[c >> 0] = 0;
         if (e >>> 0 < 255) e = e + 1 | 0; else break f;
        }
        a[c >> 0] = 1;
       } while (0);
       e = i + 6 | 0;
       if (e >>> 0 < 256) {
        g = b + e | 0;
        c = a[g >> 0] | 0;
        if (c << 24 >> 24) {
         h = a[j >> 0] | 0;
         c = c << 24 >> 24 << 6;
         f = c + h | 0;
         if ((f | 0) < 16) {
          a[j >> 0] = f;
          a[g >> 0] = 0;
          break;
         }
         c = h - c | 0;
         if ((c | 0) > -16) {
          a[j >> 0] = c;
          while (1) {
           c = b + e | 0;
           if (!(a[c >> 0] | 0)) break;
           a[c >> 0] = 0;
           if (e >>> 0 < 255) e = e + 1 | 0; else break a;
          }
          a[c >> 0] = 1;
         }
        }
       }
      }
     }
    }
   }
  } while (0);
 } while ((k | 0) != 256);
 return;
}

function kb(b, c) {
 b = b | 0;
 c = c | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0;
 l = k;
 k = k + 464 | 0;
 h = l;
 i = l + 304 | 0;
 g = l + 184 | 0;
 j = l + 64 | 0;
 f = a[c >> 0] | 0;
 a[h >> 0] = f & 15;
 a[h + 1 >> 0] = (f & 255) >>> 4;
 f = a[c + 1 >> 0] | 0;
 a[h + 2 >> 0] = f & 15;
 a[h + 3 >> 0] = (f & 255) >>> 4;
 f = a[c + 2 >> 0] | 0;
 a[h + 4 >> 0] = f & 15;
 a[h + 5 >> 0] = (f & 255) >>> 4;
 f = a[c + 3 >> 0] | 0;
 a[h + 6 >> 0] = f & 15;
 a[h + 7 >> 0] = (f & 255) >>> 4;
 f = a[c + 4 >> 0] | 0;
 a[h + 8 >> 0] = f & 15;
 a[h + 9 >> 0] = (f & 255) >>> 4;
 f = a[c + 5 >> 0] | 0;
 a[h + 10 >> 0] = f & 15;
 a[h + 11 >> 0] = (f & 255) >>> 4;
 f = a[c + 6 >> 0] | 0;
 a[h + 12 >> 0] = f & 15;
 a[h + 13 >> 0] = (f & 255) >>> 4;
 f = a[c + 7 >> 0] | 0;
 a[h + 14 >> 0] = f & 15;
 a[h + 15 >> 0] = (f & 255) >>> 4;
 f = a[c + 8 >> 0] | 0;
 a[h + 16 >> 0] = f & 15;
 a[h + 17 >> 0] = (f & 255) >>> 4;
 f = a[c + 9 >> 0] | 0;
 a[h + 18 >> 0] = f & 15;
 a[h + 19 >> 0] = (f & 255) >>> 4;
 f = a[c + 10 >> 0] | 0;
 a[h + 20 >> 0] = f & 15;
 a[h + 21 >> 0] = (f & 255) >>> 4;
 f = a[c + 11 >> 0] | 0;
 a[h + 22 >> 0] = f & 15;
 a[h + 23 >> 0] = (f & 255) >>> 4;
 f = a[c + 12 >> 0] | 0;
 a[h + 24 >> 0] = f & 15;
 a[h + 25 >> 0] = (f & 255) >>> 4;
 f = a[c + 13 >> 0] | 0;
 a[h + 26 >> 0] = f & 15;
 a[h + 27 >> 0] = (f & 255) >>> 4;
 f = a[c + 14 >> 0] | 0;
 a[h + 28 >> 0] = f & 15;
 a[h + 29 >> 0] = (f & 255) >>> 4;
 f = a[c + 15 >> 0] | 0;
 a[h + 30 >> 0] = f & 15;
 a[h + 31 >> 0] = (f & 255) >>> 4;
 f = a[c + 16 >> 0] | 0;
 a[h + 32 >> 0] = f & 15;
 a[h + 33 >> 0] = (f & 255) >>> 4;
 f = a[c + 17 >> 0] | 0;
 a[h + 34 >> 0] = f & 15;
 a[h + 35 >> 0] = (f & 255) >>> 4;
 f = a[c + 18 >> 0] | 0;
 a[h + 36 >> 0] = f & 15;
 a[h + 37 >> 0] = (f & 255) >>> 4;
 f = a[c + 19 >> 0] | 0;
 a[h + 38 >> 0] = f & 15;
 a[h + 39 >> 0] = (f & 255) >>> 4;
 f = a[c + 20 >> 0] | 0;
 a[h + 40 >> 0] = f & 15;
 a[h + 41 >> 0] = (f & 255) >>> 4;
 f = a[c + 21 >> 0] | 0;
 a[h + 42 >> 0] = f & 15;
 a[h + 43 >> 0] = (f & 255) >>> 4;
 f = a[c + 22 >> 0] | 0;
 a[h + 44 >> 0] = f & 15;
 a[h + 45 >> 0] = (f & 255) >>> 4;
 f = a[c + 23 >> 0] | 0;
 a[h + 46 >> 0] = f & 15;
 a[h + 47 >> 0] = (f & 255) >>> 4;
 f = a[c + 24 >> 0] | 0;
 a[h + 48 >> 0] = f & 15;
 a[h + 49 >> 0] = (f & 255) >>> 4;
 f = a[c + 25 >> 0] | 0;
 a[h + 50 >> 0] = f & 15;
 a[h + 51 >> 0] = (f & 255) >>> 4;
 f = a[c + 26 >> 0] | 0;
 a[h + 52 >> 0] = f & 15;
 a[h + 53 >> 0] = (f & 255) >>> 4;
 f = a[c + 27 >> 0] | 0;
 a[h + 54 >> 0] = f & 15;
 a[h + 55 >> 0] = (f & 255) >>> 4;
 f = a[c + 28 >> 0] | 0;
 a[h + 56 >> 0] = f & 15;
 a[h + 57 >> 0] = (f & 255) >>> 4;
 f = a[c + 29 >> 0] | 0;
 a[h + 58 >> 0] = f & 15;
 a[h + 59 >> 0] = (f & 255) >>> 4;
 f = a[c + 30 >> 0] | 0;
 a[h + 60 >> 0] = f & 15;
 a[h + 61 >> 0] = (f & 255) >>> 4;
 c = a[c + 31 >> 0] | 0;
 a[h + 62 >> 0] = c & 15;
 f = h + 63 | 0;
 a[f >> 0] = (c & 255) >>> 4;
 c = 0;
 e = 0;
 do {
  m = h + e | 0;
  n = c + (d[m >> 0] | 0) | 0;
  c = (n << 24) + 134217728 >> 28;
  a[m >> 0] = n - (c << 4);
  e = e + 1 | 0;
 } while ((e | 0) != 63);
 a[f >> 0] = c + (d[f >> 0] | 0);
 eb(b);
 c = 1;
 do {
  lb(j, c >>> 1, a[h + c >> 0] | 0);
  _a(i, b, j);
  bb(b, i);
  c = c + 2 | 0;
 } while (c >>> 0 < 64);
 fb(i, b);
 ab(g, i);
 db(i, g);
 ab(g, i);
 db(i, g);
 ab(g, i);
 db(i, g);
 bb(b, i);
 c = 0;
 do {
  lb(j, c >>> 1, a[h + c >> 0] | 0);
  _a(i, b, j);
  bb(b, i);
  c = c + 2 | 0;
 } while (c >>> 0 < 64);
 k = l;
 return;
}

function Ja(b, d) {
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, y = 0, z = 0, A = 0, B = 0;
 k = Ka(d) | 0;
 w = x;
 j = La(a[d + 4 >> 0] | 0, a[d + 5 >> 0] | 0, a[d + 6 >> 0] | 0) | 0;
 j = Pb(j | 0, x | 0, 6) | 0;
 A = x;
 r = La(a[d + 7 >> 0] | 0, a[d + 8 >> 0] | 0, a[d + 9 >> 0] | 0) | 0;
 r = Pb(r | 0, x | 0, 5) | 0;
 i = x;
 z = La(a[d + 10 >> 0] | 0, a[d + 11 >> 0] | 0, a[d + 12 >> 0] | 0) | 0;
 z = Pb(z | 0, x | 0, 3) | 0;
 y = x;
 v = La(a[d + 13 >> 0] | 0, a[d + 14 >> 0] | 0, a[d + 15 >> 0] | 0) | 0;
 v = Pb(v | 0, x | 0, 2) | 0;
 g = x;
 f = Ka(d + 16 | 0) | 0;
 u = x;
 o = La(a[d + 20 >> 0] | 0, a[d + 21 >> 0] | 0, a[d + 22 >> 0] | 0) | 0;
 o = Pb(o | 0, x | 0, 7) | 0;
 e = x;
 t = La(a[d + 23 >> 0] | 0, a[d + 24 >> 0] | 0, a[d + 25 >> 0] | 0) | 0;
 t = Pb(t | 0, x | 0, 5) | 0;
 s = x;
 m = La(a[d + 26 >> 0] | 0, a[d + 27 >> 0] | 0, a[d + 28 >> 0] | 0) | 0;
 m = Pb(m | 0, x | 0, 4) | 0;
 n = x;
 q = La(a[d + 29 >> 0] | 0, a[d + 30 >> 0] | 0, a[d + 31 >> 0] | 0) | 0;
 q = Pb(q | 0, x | 0, 2) | 0;
 q = q & 33554428;
 d = Qb(q | 0, 0, 16777216, 0) | 0;
 B = Ob(d | 0, x | 0, 25) | 0;
 B = Rb(0, 0, B | 0, x | 0) | 0;
 w = Qb(B & 19 | 0, 0, k | 0, w | 0) | 0;
 k = x;
 B = Qb(j | 0, A | 0, 16777216, 0) | 0;
 h = Nb(B | 0, x | 0, 25) | 0;
 h = Qb(r | 0, i | 0, h | 0, x | 0) | 0;
 i = x;
 B = Rb(j | 0, A | 0, B & -33554432 | 0, 0) | 0;
 A = x;
 j = Qb(z | 0, y | 0, 16777216, 0) | 0;
 r = Nb(j | 0, x | 0, 25) | 0;
 r = Qb(v | 0, g | 0, r | 0, x | 0) | 0;
 g = x;
 v = Qb(f | 0, u | 0, 16777216, 0) | 0;
 p = Nb(v | 0, x | 0, 25) | 0;
 p = Qb(o | 0, e | 0, p | 0, x | 0) | 0;
 e = x;
 v = Rb(f | 0, u | 0, v & -33554432 | 0, 0) | 0;
 u = x;
 f = Qb(t | 0, s | 0, 16777216, 0) | 0;
 o = Nb(f | 0, x | 0, 25) | 0;
 o = Qb(m | 0, n | 0, o | 0, x | 0) | 0;
 n = x;
 m = Qb(w | 0, k | 0, 33554432, 0) | 0;
 l = Ob(m | 0, x | 0, 26) | 0;
 l = Qb(B | 0, A | 0, l | 0, x | 0) | 0;
 m = Rb(w | 0, k | 0, m & -67108864 | 0, 0) | 0;
 k = Qb(h | 0, i | 0, 33554432, 0) | 0;
 w = Ob(k | 0, x | 0, 26) | 0;
 w = Qb(z | 0, y | 0, w | 0, x | 0) | 0;
 j = Rb(w | 0, x | 0, j & -33554432 | 0, 0) | 0;
 k = Rb(h | 0, i | 0, k & -67108864 | 0, 0) | 0;
 i = Qb(r | 0, g | 0, 33554432, 0) | 0;
 h = Ob(i | 0, x | 0, 26) | 0;
 h = Qb(v | 0, u | 0, h | 0, x | 0) | 0;
 i = Rb(r | 0, g | 0, i & -67108864 | 0, 0) | 0;
 g = Qb(p | 0, e | 0, 33554432, 0) | 0;
 r = Ob(g | 0, x | 0, 26) | 0;
 r = Qb(t | 0, s | 0, r | 0, x | 0) | 0;
 f = Rb(r | 0, x | 0, f & -33554432 | 0, 0) | 0;
 g = Rb(p | 0, e | 0, g & -67108864 | 0, 0) | 0;
 e = Qb(o | 0, n | 0, 33554432, 0) | 0;
 p = Ob(e | 0, x | 0, 26) | 0;
 p = Qb(q | 0, 0, p | 0, x | 0) | 0;
 d = Rb(p | 0, x | 0, d & 33554432 | 0, 0) | 0;
 e = Rb(o | 0, n | 0, e & -67108864 | 0, 0) | 0;
 c[b >> 2] = m;
 c[b + 4 >> 2] = l;
 c[b + 8 >> 2] = k;
 c[b + 12 >> 2] = j;
 c[b + 16 >> 2] = i;
 c[b + 20 >> 2] = h;
 c[b + 24 >> 2] = g;
 c[b + 28 >> 2] = f;
 c[b + 32 >> 2] = e;
 c[b + 36 >> 2] = d;
 return;
}

function la(a, b) {
 a = a | 0;
 b = b | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0;
 i = d[b >> 0] | 0;
 j = Pb(d[b + 1 >> 0] | 0 | 0, 0, 8) | 0;
 k = x;
 g = Pb(d[b + 2 >> 0] | 0 | 0, 0, 16) | 0;
 k = k | x;
 h = b + 3 | 0;
 e = Pb(d[h >> 0] | 0 | 0, 0, 24) | 0;
 f = a;
 c[f >> 2] = j | i | g | e & 50331648;
 c[f + 4 >> 2] = k;
 h = d[h >> 0] | 0;
 f = Pb(d[b + 4 >> 0] | 0 | 0, 0, 8) | 0;
 k = x;
 e = Pb(d[b + 5 >> 0] | 0 | 0, 0, 16) | 0;
 k = k | x;
 g = b + 6 | 0;
 i = Pb(d[g >> 0] | 0 | 0, 0, 24) | 0;
 k = Ob(f | h | e | i | 0, k | x | 0, 2) | 0;
 i = a + 8 | 0;
 c[i >> 2] = k & 33554431;
 c[i + 4 >> 2] = 0;
 g = d[g >> 0] | 0;
 i = Pb(d[b + 7 >> 0] | 0 | 0, 0, 8) | 0;
 k = x;
 e = Pb(d[b + 8 >> 0] | 0 | 0, 0, 16) | 0;
 k = k | x;
 h = b + 9 | 0;
 f = Pb(d[h >> 0] | 0 | 0, 0, 24) | 0;
 k = Ob(i | g | e | f | 0, k | x | 0, 3) | 0;
 f = a + 16 | 0;
 c[f >> 2] = k & 67108863;
 c[f + 4 >> 2] = 0;
 h = d[h >> 0] | 0;
 f = Pb(d[b + 10 >> 0] | 0 | 0, 0, 8) | 0;
 k = x;
 e = Pb(d[b + 11 >> 0] | 0 | 0, 0, 16) | 0;
 k = k | x;
 g = b + 12 | 0;
 i = Pb(d[g >> 0] | 0 | 0, 0, 24) | 0;
 k = Ob(f | h | e | i | 0, k | x | 0, 5) | 0;
 i = a + 24 | 0;
 c[i >> 2] = k & 33554431;
 c[i + 4 >> 2] = 0;
 g = d[g >> 0] | 0;
 i = Pb(d[b + 13 >> 0] | 0 | 0, 0, 8) | 0;
 k = x;
 e = Pb(d[b + 14 >> 0] | 0 | 0, 0, 16) | 0;
 k = k | x;
 h = Pb(d[b + 15 >> 0] | 0 | 0, 0, 24) | 0;
 k = Ob(i | g | e | h | 0, k | x | 0, 6) | 0;
 h = a + 32 | 0;
 c[h >> 2] = k & 67108863;
 c[h + 4 >> 2] = 0;
 h = d[b + 16 >> 0] | 0;
 k = Pb(d[b + 17 >> 0] | 0 | 0, 0, 8) | 0;
 e = x;
 g = Pb(d[b + 18 >> 0] | 0 | 0, 0, 16) | 0;
 e = e | x;
 i = b + 19 | 0;
 f = Pb(d[i >> 0] | 0 | 0, 0, 24) | 0;
 j = a + 40 | 0;
 c[j >> 2] = k | h | g | f & 16777216;
 c[j + 4 >> 2] = e;
 i = d[i >> 0] | 0;
 j = Pb(d[b + 20 >> 0] | 0 | 0, 0, 8) | 0;
 e = x;
 f = Pb(d[b + 21 >> 0] | 0 | 0, 0, 16) | 0;
 e = e | x;
 g = b + 22 | 0;
 h = Pb(d[g >> 0] | 0 | 0, 0, 24) | 0;
 e = Ob(j | i | f | h | 0, e | x | 0, 1) | 0;
 h = a + 48 | 0;
 c[h >> 2] = e & 67108863;
 c[h + 4 >> 2] = 0;
 g = d[g >> 0] | 0;
 h = Pb(d[b + 23 >> 0] | 0 | 0, 0, 8) | 0;
 e = x;
 f = Pb(d[b + 24 >> 0] | 0 | 0, 0, 16) | 0;
 e = e | x;
 i = b + 25 | 0;
 j = Pb(d[i >> 0] | 0 | 0, 0, 24) | 0;
 e = Ob(h | g | f | j | 0, e | x | 0, 3) | 0;
 j = a + 56 | 0;
 c[j >> 2] = e & 33554431;
 c[j + 4 >> 2] = 0;
 i = d[i >> 0] | 0;
 j = Pb(d[b + 26 >> 0] | 0 | 0, 0, 8) | 0;
 e = x;
 f = Pb(d[b + 27 >> 0] | 0 | 0, 0, 16) | 0;
 e = e | x;
 g = b + 28 | 0;
 h = Pb(d[g >> 0] | 0 | 0, 0, 24) | 0;
 e = Ob(j | i | f | h | 0, e | x | 0, 4) | 0;
 h = a + 64 | 0;
 c[h >> 2] = e & 67108863;
 c[h + 4 >> 2] = 0;
 g = d[g >> 0] | 0;
 h = Pb(d[b + 29 >> 0] | 0 | 0, 0, 8) | 0;
 e = x;
 f = Pb(d[b + 30 >> 0] | 0 | 0, 0, 16) | 0;
 e = e | x;
 b = Pb(d[b + 31 >> 0] | 0 | 0, 0, 24) | 0;
 e = Ob(h | g | f | b | 0, e | x | 0, 6) | 0;
 b = a + 72 | 0;
 c[b >> 2] = e & 33554431;
 c[b + 4 >> 2] = 0;
 return;
}

function ua(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
 h = a;
 d = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 f = va(d, h) | 0;
 i = x;
 k = Pb(f | 0, i | 0, 26) | 0;
 k = Rb(d | 0, h | 0, k | 0, x | 0) | 0;
 h = x;
 d = a + 8 | 0;
 m = d;
 i = Qb(c[m >> 2] | 0, c[m + 4 >> 2] | 0, f | 0, i | 0) | 0;
 f = x;
 m = wa(i, f) | 0;
 b = x;
 g = Pb(m | 0, b | 0, 25) | 0;
 g = Rb(i | 0, f | 0, g | 0, x | 0) | 0;
 f = x;
 i = a + 16 | 0;
 e = i;
 b = Qb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, m | 0, b | 0) | 0;
 m = x;
 e = va(b, m) | 0;
 j = x;
 l = Pb(e | 0, j | 0, 26) | 0;
 l = Rb(b | 0, m | 0, l | 0, x | 0) | 0;
 c[i >> 2] = l;
 c[i + 4 >> 2] = x;
 i = a + 24 | 0;
 l = i;
 j = Qb(c[l >> 2] | 0, c[l + 4 >> 2] | 0, e | 0, j | 0) | 0;
 e = x;
 l = wa(j, e) | 0;
 m = x;
 b = Pb(l | 0, m | 0, 25) | 0;
 b = Rb(j | 0, e | 0, b | 0, x | 0) | 0;
 c[i >> 2] = b;
 c[i + 4 >> 2] = x;
 i = a + 32 | 0;
 b = i;
 m = Qb(c[b >> 2] | 0, c[b + 4 >> 2] | 0, l | 0, m | 0) | 0;
 l = x;
 b = va(m, l) | 0;
 e = x;
 j = Pb(b | 0, e | 0, 26) | 0;
 j = Rb(m | 0, l | 0, j | 0, x | 0) | 0;
 c[i >> 2] = j;
 c[i + 4 >> 2] = x;
 i = a + 40 | 0;
 j = i;
 e = Qb(c[j >> 2] | 0, c[j + 4 >> 2] | 0, b | 0, e | 0) | 0;
 b = x;
 j = wa(e, b) | 0;
 l = x;
 m = Pb(j | 0, l | 0, 25) | 0;
 m = Rb(e | 0, b | 0, m | 0, x | 0) | 0;
 c[i >> 2] = m;
 c[i + 4 >> 2] = x;
 i = a + 48 | 0;
 m = i;
 l = Qb(c[m >> 2] | 0, c[m + 4 >> 2] | 0, j | 0, l | 0) | 0;
 j = x;
 m = va(l, j) | 0;
 b = x;
 e = Pb(m | 0, b | 0, 26) | 0;
 e = Rb(l | 0, j | 0, e | 0, x | 0) | 0;
 c[i >> 2] = e;
 c[i + 4 >> 2] = x;
 i = a + 56 | 0;
 e = i;
 b = Qb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, m | 0, b | 0) | 0;
 m = x;
 e = wa(b, m) | 0;
 j = x;
 l = Pb(e | 0, j | 0, 25) | 0;
 l = Rb(b | 0, m | 0, l | 0, x | 0) | 0;
 c[i >> 2] = l;
 c[i + 4 >> 2] = x;
 i = a + 64 | 0;
 l = i;
 j = Qb(c[l >> 2] | 0, c[l + 4 >> 2] | 0, e | 0, j | 0) | 0;
 e = x;
 l = va(j, e) | 0;
 m = x;
 b = Pb(l | 0, m | 0, 26) | 0;
 b = Rb(j | 0, e | 0, b | 0, x | 0) | 0;
 c[i >> 2] = b;
 c[i + 4 >> 2] = x;
 i = a + 72 | 0;
 b = i;
 m = Qb(c[b >> 2] | 0, c[b + 4 >> 2] | 0, l | 0, m | 0) | 0;
 l = x;
 b = wa(m, l) | 0;
 e = x;
 j = Pb(b | 0, e | 0, 25) | 0;
 j = Rb(m | 0, l | 0, j | 0, x | 0) | 0;
 c[i >> 2] = j;
 c[i + 4 >> 2] = x;
 i = Mb(b | 0, e | 0, 18, 0) | 0;
 j = x;
 e = Qb(k | 0, h | 0, b | 0, e | 0) | 0;
 j = Qb(e | 0, x | 0, i | 0, j | 0) | 0;
 i = x;
 e = a + 80 | 0;
 c[e >> 2] = 0;
 c[e + 4 >> 2] = 0;
 e = va(j, i) | 0;
 b = x;
 h = Pb(e | 0, b | 0, 26) | 0;
 h = Rb(j | 0, i | 0, h | 0, x | 0) | 0;
 c[a >> 2] = h;
 c[a + 4 >> 2] = x;
 b = Qb(g | 0, f | 0, e | 0, b | 0) | 0;
 a = d;
 c[a >> 2] = b;
 c[a + 4 >> 2] = x;
 return;
}

function ta(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
 e = a + 144 | 0;
 i = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 g = a + 64 | 0;
 h = g;
 f = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 b = Mb(i | 0, e | 0, 18, 0) | 0;
 d = x;
 e = Qb(f | 0, h | 0, i | 0, e | 0) | 0;
 d = Qb(e | 0, x | 0, b | 0, d | 0) | 0;
 c[g >> 2] = d;
 c[g + 4 >> 2] = x;
 g = a + 136 | 0;
 d = c[g >> 2] | 0;
 g = c[g + 4 >> 2] | 0;
 b = a + 56 | 0;
 e = b;
 i = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 h = Mb(d | 0, g | 0, 18, 0) | 0;
 f = x;
 g = Qb(i | 0, e | 0, d | 0, g | 0) | 0;
 f = Qb(g | 0, x | 0, h | 0, f | 0) | 0;
 c[b >> 2] = f;
 c[b + 4 >> 2] = x;
 b = a + 128 | 0;
 f = c[b >> 2] | 0;
 b = c[b + 4 >> 2] | 0;
 h = a + 48 | 0;
 g = h;
 d = c[g >> 2] | 0;
 g = c[g + 4 >> 2] | 0;
 e = Mb(f | 0, b | 0, 18, 0) | 0;
 i = x;
 b = Qb(d | 0, g | 0, f | 0, b | 0) | 0;
 i = Qb(b | 0, x | 0, e | 0, i | 0) | 0;
 c[h >> 2] = i;
 c[h + 4 >> 2] = x;
 h = a + 120 | 0;
 i = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 e = a + 40 | 0;
 b = e;
 f = c[b >> 2] | 0;
 b = c[b + 4 >> 2] | 0;
 g = Mb(i | 0, h | 0, 18, 0) | 0;
 d = x;
 h = Qb(f | 0, b | 0, i | 0, h | 0) | 0;
 d = Qb(h | 0, x | 0, g | 0, d | 0) | 0;
 c[e >> 2] = d;
 c[e + 4 >> 2] = x;
 e = a + 112 | 0;
 d = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 g = a + 32 | 0;
 h = g;
 i = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 b = Mb(d | 0, e | 0, 18, 0) | 0;
 f = x;
 e = Qb(i | 0, h | 0, d | 0, e | 0) | 0;
 f = Qb(e | 0, x | 0, b | 0, f | 0) | 0;
 c[g >> 2] = f;
 c[g + 4 >> 2] = x;
 g = a + 104 | 0;
 f = c[g >> 2] | 0;
 g = c[g + 4 >> 2] | 0;
 b = a + 24 | 0;
 e = b;
 d = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 h = Mb(f | 0, g | 0, 18, 0) | 0;
 i = x;
 g = Qb(d | 0, e | 0, f | 0, g | 0) | 0;
 i = Qb(g | 0, x | 0, h | 0, i | 0) | 0;
 c[b >> 2] = i;
 c[b + 4 >> 2] = x;
 b = a + 96 | 0;
 i = c[b >> 2] | 0;
 b = c[b + 4 >> 2] | 0;
 h = a + 16 | 0;
 g = h;
 f = c[g >> 2] | 0;
 g = c[g + 4 >> 2] | 0;
 e = Mb(i | 0, b | 0, 18, 0) | 0;
 d = x;
 b = Qb(f | 0, g | 0, i | 0, b | 0) | 0;
 d = Qb(b | 0, x | 0, e | 0, d | 0) | 0;
 c[h >> 2] = d;
 c[h + 4 >> 2] = x;
 h = a + 88 | 0;
 d = c[h >> 2] | 0;
 h = c[h + 4 >> 2] | 0;
 e = a + 8 | 0;
 b = e;
 i = c[b >> 2] | 0;
 b = c[b + 4 >> 2] | 0;
 g = Mb(d | 0, h | 0, 18, 0) | 0;
 f = x;
 h = Qb(i | 0, b | 0, d | 0, h | 0) | 0;
 f = Qb(h | 0, x | 0, g | 0, f | 0) | 0;
 c[e >> 2] = f;
 c[e + 4 >> 2] = x;
 e = a + 80 | 0;
 f = c[e >> 2] | 0;
 e = c[e + 4 >> 2] | 0;
 g = a;
 h = c[g >> 2] | 0;
 g = c[g + 4 >> 2] | 0;
 d = Mb(f | 0, e | 0, 18, 0) | 0;
 b = x;
 e = Qb(h | 0, g | 0, f | 0, e | 0) | 0;
 b = Qb(e | 0, x | 0, d | 0, b | 0) | 0;
 c[a >> 2] = b;
 c[a + 4 >> 2] = x;
 return;
}

function za(a, b, d, e) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0;
 d = 0 - d | 0;
 h = a;
 f = c[h >> 2] | 0;
 g = b;
 g = (c[g >> 2] ^ f) & d;
 f = g ^ f;
 h = a;
 c[h >> 2] = f;
 c[h + 4 >> 2] = ((f | 0) < 0) << 31 >> 31;
 g = g ^ c[b >> 2];
 h = b;
 c[h >> 2] = g;
 c[h + 4 >> 2] = ((g | 0) < 0) << 31 >> 31;
 h = a + 8 | 0;
 g = h;
 f = c[g >> 2] | 0;
 e = b + 8 | 0;
 i = e;
 i = (c[i >> 2] ^ f) & d;
 f = i ^ f;
 c[h >> 2] = f;
 c[h + 4 >> 2] = ((f | 0) < 0) << 31 >> 31;
 i = i ^ c[e >> 2];
 c[e >> 2] = i;
 c[e + 4 >> 2] = ((i | 0) < 0) << 31 >> 31;
 e = a + 16 | 0;
 i = e;
 h = c[i >> 2] | 0;
 f = b + 16 | 0;
 g = f;
 g = (c[g >> 2] ^ h) & d;
 h = g ^ h;
 c[e >> 2] = h;
 c[e + 4 >> 2] = ((h | 0) < 0) << 31 >> 31;
 g = g ^ c[f >> 2];
 c[f >> 2] = g;
 c[f + 4 >> 2] = ((g | 0) < 0) << 31 >> 31;
 f = a + 24 | 0;
 g = f;
 e = c[g >> 2] | 0;
 h = b + 24 | 0;
 i = h;
 i = (c[i >> 2] ^ e) & d;
 e = i ^ e;
 c[f >> 2] = e;
 c[f + 4 >> 2] = ((e | 0) < 0) << 31 >> 31;
 i = i ^ c[h >> 2];
 c[h >> 2] = i;
 c[h + 4 >> 2] = ((i | 0) < 0) << 31 >> 31;
 h = a + 32 | 0;
 i = h;
 f = c[i >> 2] | 0;
 e = b + 32 | 0;
 g = e;
 g = (c[g >> 2] ^ f) & d;
 f = g ^ f;
 c[h >> 2] = f;
 c[h + 4 >> 2] = ((f | 0) < 0) << 31 >> 31;
 g = g ^ c[e >> 2];
 c[e >> 2] = g;
 c[e + 4 >> 2] = ((g | 0) < 0) << 31 >> 31;
 e = a + 40 | 0;
 g = e;
 h = c[g >> 2] | 0;
 f = b + 40 | 0;
 i = f;
 i = (c[i >> 2] ^ h) & d;
 h = i ^ h;
 c[e >> 2] = h;
 c[e + 4 >> 2] = ((h | 0) < 0) << 31 >> 31;
 i = i ^ c[f >> 2];
 c[f >> 2] = i;
 c[f + 4 >> 2] = ((i | 0) < 0) << 31 >> 31;
 f = a + 48 | 0;
 i = f;
 e = c[i >> 2] | 0;
 h = b + 48 | 0;
 g = h;
 g = (c[g >> 2] ^ e) & d;
 e = g ^ e;
 c[f >> 2] = e;
 c[f + 4 >> 2] = ((e | 0) < 0) << 31 >> 31;
 g = g ^ c[h >> 2];
 c[h >> 2] = g;
 c[h + 4 >> 2] = ((g | 0) < 0) << 31 >> 31;
 h = a + 56 | 0;
 g = h;
 f = c[g >> 2] | 0;
 e = b + 56 | 0;
 i = e;
 i = (c[i >> 2] ^ f) & d;
 f = i ^ f;
 c[h >> 2] = f;
 c[h + 4 >> 2] = ((f | 0) < 0) << 31 >> 31;
 i = i ^ c[e >> 2];
 c[e >> 2] = i;
 c[e + 4 >> 2] = ((i | 0) < 0) << 31 >> 31;
 e = a + 64 | 0;
 i = e;
 h = c[i >> 2] | 0;
 f = b + 64 | 0;
 g = f;
 g = (c[g >> 2] ^ h) & d;
 h = g ^ h;
 c[e >> 2] = h;
 c[e + 4 >> 2] = ((h | 0) < 0) << 31 >> 31;
 g = g ^ c[f >> 2];
 c[f >> 2] = g;
 c[f + 4 >> 2] = ((g | 0) < 0) << 31 >> 31;
 f = a + 72 | 0;
 g = f;
 a = c[g >> 2] | 0;
 e = b + 72 | 0;
 b = e;
 d = (c[b >> 2] ^ a) & d;
 a = d ^ a;
 b = f;
 c[b >> 2] = a;
 c[b + 4 >> 2] = ((a | 0) < 0) << 31 >> 31;
 d = d ^ c[e >> 2];
 c[e >> 2] = d;
 c[e + 4 >> 2] = ((d | 0) < 0) << 31 >> 31;
 return;
}

function na(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0;
 h = k;
 k = k + 800 | 0;
 n = h + 720 | 0;
 m = h + 640 | 0;
 e = h + 560 | 0;
 l = h + 480 | 0;
 i = h + 400 | 0;
 j = h + 320 | 0;
 f = h + 240 | 0;
 g = h + 160 | 0;
 c = h + 80 | 0;
 d = h;
 xa(n, b);
 xa(d, n);
 xa(c, d);
 oa(m, c, b);
 oa(e, m, n);
 xa(c, e);
 oa(l, c, m);
 xa(c, l);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 oa(i, c, l);
 xa(c, i);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 oa(j, d, i);
 xa(c, j);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 oa(c, d, j);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 oa(f, c, i);
 xa(c, f);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 oa(g, d, f);
 xa(d, g);
 xa(c, d);
 b = 2;
 do {
  xa(d, c);
  xa(c, d);
  b = b + 2 | 0;
 } while (b >>> 0 < 100);
 oa(d, c, g);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 oa(c, d, f);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 xa(c, d);
 xa(d, c);
 oa(a, d, e);
 k = h;
 return;
}

function ma(a, b, e, f) {
 a = a | 0;
 b = b | 0;
 e = e | 0;
 f = f | 0;
 var g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
 s = k;
 k = k + 1280 | 0;
 m = s + 1120 | 0;
 n = s + 960 | 0;
 o = s + 800 | 0;
 p = s + 640 | 0;
 q = s + 480 | 0;
 r = s + 320 | 0;
 j = s + 160 | 0;
 l = s;
 Ub(n | 0, 0, 152) | 0;
 g = n;
 c[g >> 2] = 1;
 c[g + 4 >> 2] = 0;
 Ub(o | 0, 0, 152) | 0;
 g = o;
 c[g >> 2] = 1;
 c[g + 4 >> 2] = 0;
 Ub(p | 0, 0, 152) | 0;
 Ub(q | 0, 0, 152) | 0;
 Ub(r | 0, 0, 152) | 0;
 g = r;
 c[g >> 2] = 1;
 c[g + 4 >> 2] = 0;
 Ub(j | 0, 0, 152) | 0;
 Ub(l | 0, 0, 152) | 0;
 g = l;
 c[g >> 2] = 1;
 c[g + 4 >> 2] = 0;
 g = m + 80 | 0;
 i = g + 72 | 0;
 do {
  c[g >> 2] = 0;
  g = g + 4 | 0;
 } while ((g | 0) < (i | 0));
 g = m;
 h = f;
 i = g + 80 | 0;
 do {
  c[g >> 2] = c[h >> 2];
  g = g + 4 | 0;
  h = h + 4 | 0;
 } while ((g | 0) < (i | 0));
 g = 0;
 do {
  i = d[e + (31 - g) >> 0] | 0;
  h = i >>> 7;
  za(o, m, h, 0);
  za(p, n, h, 0);
  Aa(j, l, q, r, o, p, m, n, f);
  za(j, q, h, 0);
  za(l, r, h, 0);
  h = i >>> 6 & 1;
  za(j, q, h, 0);
  za(l, r, h, 0);
  Aa(o, p, m, n, j, l, q, r, f);
  za(o, m, h, 0);
  za(p, n, h, 0);
  h = i >>> 5 & 1;
  za(o, m, h, 0);
  za(p, n, h, 0);
  Aa(j, l, q, r, o, p, m, n, f);
  za(j, q, h, 0);
  za(l, r, h, 0);
  h = i >>> 4 & 1;
  za(j, q, h, 0);
  za(l, r, h, 0);
  Aa(o, p, m, n, j, l, q, r, f);
  za(o, m, h, 0);
  za(p, n, h, 0);
  h = i >>> 3 & 1;
  za(o, m, h, 0);
  za(p, n, h, 0);
  Aa(j, l, q, r, o, p, m, n, f);
  za(j, q, h, 0);
  za(l, r, h, 0);
  h = i >>> 2 & 1;
  za(j, q, h, 0);
  za(l, r, h, 0);
  Aa(o, p, m, n, j, l, q, r, f);
  za(o, m, h, 0);
  za(p, n, h, 0);
  h = i >>> 1 & 1;
  za(o, m, h, 0);
  za(p, n, h, 0);
  Aa(j, l, q, r, o, p, m, n, f);
  za(j, q, h, 0);
  za(l, r, h, 0);
  i = i & 1;
  za(j, q, i, 0);
  za(l, r, i, 0);
  Aa(o, p, m, n, j, l, q, r, f);
  za(o, m, i, 0);
  za(p, n, i, 0);
  g = g + 1 | 0;
 } while ((g | 0) != 32);
 g = a;
 h = o;
 i = g + 80 | 0;
 do {
  c[g >> 2] = c[h >> 2];
  g = g + 4 | 0;
  h = h + 4 | 0;
 } while ((g | 0) < (i | 0));
 g = b;
 h = p;
 i = g + 80 | 0;
 do {
  c[g >> 2] = c[h >> 2];
  g = g + 4 | 0;
  h = h + 4 | 0;
 } while ((g | 0) < (i | 0));
 k = s;
 return;
}

function Ma(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0, g = 0;
 g = k;
 k = k + 192 | 0;
 c = g + 144 | 0;
 d = g + 96 | 0;
 e = g + 48 | 0;
 f = g;
 Sa(c, b);
 Sa(d, c);
 Sa(d, d);
 Pa(d, b, d);
 Pa(c, c, d);
 Sa(e, c);
 Pa(d, d, e);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(e, e, d);
 Sa(f, e);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Pa(e, f, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(e, e, d);
 Sa(f, e);
 b = 1;
 do {
  Sa(f, f);
  b = b + 1 | 0;
 } while ((b | 0) != 100);
 Pa(e, f, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(d, d);
 Sa(d, d);
 Sa(d, d);
 Sa(d, d);
 Sa(d, d);
 Pa(a, d, c);
 k = g;
 return;
}

function Ra(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0, g = 0;
 g = k;
 k = k + 144 | 0;
 d = g + 96 | 0;
 e = g + 48 | 0;
 f = g;
 Sa(d, b);
 Sa(e, d);
 Sa(e, e);
 Pa(e, b, e);
 Pa(d, d, e);
 Sa(d, d);
 Pa(d, e, d);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(e, e, d);
 Sa(f, e);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Sa(f, f);
 Pa(e, f, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(e, d);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(e, e, d);
 Sa(f, e);
 c = 1;
 do {
  Sa(f, f);
  c = c + 1 | 0;
 } while ((c | 0) != 100);
 Pa(e, f, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Sa(e, e);
 Pa(d, e, d);
 Sa(d, d);
 Sa(d, d);
 Pa(a, d, b);
 k = g;
 return;
}

function Va(b, d) {
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0;
 t = c[d >> 2] | 0;
 s = c[d + 4 >> 2] | 0;
 q = c[d + 8 >> 2] | 0;
 o = c[d + 12 >> 2] | 0;
 m = c[d + 16 >> 2] | 0;
 l = c[d + 20 >> 2] | 0;
 k = c[d + 24 >> 2] | 0;
 i = c[d + 28 >> 2] | 0;
 g = c[d + 32 >> 2] | 0;
 e = c[d + 36 >> 2] | 0;
 t = (((((((((((((e * 19 | 0) + 16777216 >> 25) + t >> 26) + s >> 25) + q >> 26) + o >> 25) + m >> 26) + l >> 25) + k >> 26) + i >> 25) + g >> 26) + e >> 25) * 19 | 0) + t | 0;
 s = (t >> 26) + s | 0;
 q = (s >> 25) + q | 0;
 r = s & 33554431;
 o = (q >> 26) + o | 0;
 p = q & 67108863;
 m = (o >> 25) + m | 0;
 n = o & 33554431;
 l = (m >> 26) + l | 0;
 k = (l >> 25) + k | 0;
 i = (k >> 26) + i | 0;
 j = k & 67108863;
 g = (i >> 25) + g | 0;
 h = i & 33554431;
 e = (g >> 26) + e | 0;
 f = g & 67108863;
 d = e & 33554431;
 a[b >> 0] = t;
 a[b + 1 >> 0] = t >>> 8;
 a[b + 2 >> 0] = t >>> 16;
 a[b + 3 >> 0] = r << 2 | t >>> 24 & 3;
 a[b + 4 >> 0] = s >>> 6;
 a[b + 5 >> 0] = s >>> 14;
 a[b + 6 >> 0] = p << 3 | r >>> 22;
 a[b + 7 >> 0] = q >>> 5;
 a[b + 8 >> 0] = q >>> 13;
 a[b + 9 >> 0] = n << 5 | p >>> 21;
 a[b + 10 >> 0] = o >>> 3;
 a[b + 11 >> 0] = o >>> 11;
 a[b + 12 >> 0] = m << 6 | n >>> 19;
 a[b + 13 >> 0] = m >>> 2;
 a[b + 14 >> 0] = m >>> 10;
 a[b + 15 >> 0] = m >>> 18;
 a[b + 16 >> 0] = l;
 a[b + 17 >> 0] = l >>> 8;
 a[b + 18 >> 0] = l >>> 16;
 a[b + 19 >> 0] = j << 1 | l >>> 24 & 1;
 a[b + 20 >> 0] = k >>> 7;
 a[b + 21 >> 0] = k >>> 15;
 a[b + 22 >> 0] = h << 3 | j >>> 23;
 a[b + 23 >> 0] = i >>> 5;
 a[b + 24 >> 0] = i >>> 13;
 a[b + 25 >> 0] = f << 4 | h >>> 21;
 a[b + 26 >> 0] = g >>> 4;
 a[b + 27 >> 0] = g >>> 12;
 a[b + 28 >> 0] = d << 6 | f >>> 20;
 a[b + 29 >> 0] = e >>> 2;
 a[b + 30 >> 0] = e >>> 10;
 a[b + 31 >> 0] = d >>> 18;
 return;
}

function Ba(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0;
 e = a;
 d = b;
 e = Qb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 d = a;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 8 | 0;
 e = d;
 f = b + 8 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 16 | 0;
 e = d;
 f = b + 16 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 24 | 0;
 e = d;
 f = b + 24 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 32 | 0;
 e = d;
 f = b + 32 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 40 | 0;
 e = d;
 f = b + 40 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 48 | 0;
 e = d;
 f = b + 48 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 56 | 0;
 e = d;
 f = b + 56 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 64 | 0;
 e = d;
 f = b + 64 | 0;
 e = Qb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = a + 72 | 0;
 a = d;
 b = b + 72 | 0;
 a = Qb(c[b >> 2] | 0, c[b + 4 >> 2] | 0, c[a >> 2] | 0, c[a + 4 >> 2] | 0) | 0;
 b = d;
 c[b >> 2] = a;
 c[b + 4 >> 2] = x;
 return;
}

function Ca(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0;
 e = b;
 f = a;
 f = Rb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, c[f >> 2] | 0, c[f + 4 >> 2] | 0) | 0;
 e = a;
 c[e >> 2] = f;
 c[e + 4 >> 2] = x;
 e = b + 8 | 0;
 f = a + 8 | 0;
 d = f;
 d = Rb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, c[d >> 2] | 0, c[d + 4 >> 2] | 0) | 0;
 c[f >> 2] = d;
 c[f + 4 >> 2] = x;
 f = b + 16 | 0;
 d = a + 16 | 0;
 e = d;
 e = Rb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 24 | 0;
 e = a + 24 | 0;
 f = e;
 f = Rb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, c[f >> 2] | 0, c[f + 4 >> 2] | 0) | 0;
 c[e >> 2] = f;
 c[e + 4 >> 2] = x;
 e = b + 32 | 0;
 f = a + 32 | 0;
 d = f;
 d = Rb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, c[d >> 2] | 0, c[d + 4 >> 2] | 0) | 0;
 c[f >> 2] = d;
 c[f + 4 >> 2] = x;
 f = b + 40 | 0;
 d = a + 40 | 0;
 e = d;
 e = Rb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 48 | 0;
 e = a + 48 | 0;
 f = e;
 f = Rb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, c[f >> 2] | 0, c[f + 4 >> 2] | 0) | 0;
 c[e >> 2] = f;
 c[e + 4 >> 2] = x;
 e = b + 56 | 0;
 f = a + 56 | 0;
 d = f;
 d = Rb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, c[d >> 2] | 0, c[d + 4 >> 2] | 0) | 0;
 c[f >> 2] = d;
 c[f + 4 >> 2] = x;
 f = b + 64 | 0;
 d = a + 64 | 0;
 e = d;
 e = Rb(c[f >> 2] | 0, c[f + 4 >> 2] | 0, c[e >> 2] | 0, c[e + 4 >> 2] | 0) | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 72 | 0;
 b = a + 72 | 0;
 a = b;
 a = Rb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, c[a >> 2] | 0, c[a + 4 >> 2] | 0) | 0;
 c[b >> 2] = a;
 c[b + 4 >> 2] = x;
 return;
}

function Xa(b, c, d, e) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0;
 m = k;
 k = k + 2272 | 0;
 g = m + 1536 | 0;
 h = m + 1280 | 0;
 i = m;
 j = m + 2112 | 0;
 l = m + 1952 | 0;
 n = m + 1792 | 0;
 Ya(g, c);
 Ya(h, e);
 gb(i, d);
 fb(j, d);
 bb(n, j);
 Wa(j, n, i);
 bb(l, j);
 c = i + 160 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 c = i + 320 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 c = i + 480 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 c = i + 640 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 c = i + 800 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 c = i + 960 | 0;
 gb(c, l);
 Wa(j, n, c);
 bb(l, j);
 gb(i + 1120 | 0, l);
 cb(b);
 c = 255;
 while (1) {
  if (a[g + c >> 0] | 0) break;
  if (a[h + c >> 0] | 0) break;
  if (!c) {
   f = 16;
   break;
  } else c = c + -1 | 0;
 }
 if ((f | 0) == 16) {
  k = m;
  return;
 }
 if ((c | 0) <= -1) {
  k = m;
  return;
 }
 while (1) {
  db(j, b);
  d = a[g + c >> 0] | 0;
  if (d << 24 >> 24 > 0) {
   bb(l, j);
   Wa(j, l, i + (((d & 255) >>> 1 & 255) * 160 | 0) | 0);
  } else if (d << 24 >> 24 < 0) {
   bb(l, j);
   pb(j, l, i + ((((d << 24 >> 24) / -2 | 0) << 24 >> 24) * 160 | 0) | 0);
  }
  d = a[h + c >> 0] | 0;
  if (d << 24 >> 24 > 0) {
   bb(l, j);
   _a(j, l, 16 + (((d & 255) >>> 1 & 255) * 120 | 0) | 0);
  } else if (d << 24 >> 24 < 0) {
   bb(l, j);
   $a(j, l, 16 + ((((d << 24 >> 24) / -2 | 0) << 24 >> 24) * 120 | 0) | 0);
  }
  ab(b, j);
  if ((c | 0) > 0) c = c + -1 | 0; else break;
 }
 k = m;
 return;
}

function rb(b, e, f, g, h, i) {
 b = b | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 h = h | 0;
 i = i | 0;
 var j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0;
 t = k;
 k = k + 480 | 0;
 n = t + 160 | 0;
 o = t + 128 | 0;
 p = t + 96 | 0;
 q = t + 32 | 0;
 j = t;
 l = t + 312 | 0;
 m = t + 192 | 0;
 if (!(h >>> 0 < 0 | (h | 0) == 0 & g >>> 0 < 64)) if ((d[f + 63 >> 0] | 0) <= 31) if (!(Za(l, i) | 0)) {
  s = n;
  r = s + 32 | 0;
  do {
   a[s >> 0] = a[i >> 0] | 0;
   s = s + 1 | 0;
   i = i + 1 | 0;
  } while ((s | 0) < (r | 0));
  s = o;
  i = f;
  r = s + 32 | 0;
  do {
   a[s >> 0] = a[i >> 0] | 0;
   s = s + 1 | 0;
   i = i + 1 | 0;
  } while ((s | 0) < (r | 0));
  s = p;
  i = f + 32 | 0;
  r = s + 32 | 0;
  do {
   a[s >> 0] = a[i >> 0] | 0;
   s = s + 1 | 0;
   i = i + 1 | 0;
  } while ((s | 0) < (r | 0));
  Tb(b | 0, f | 0, g | 0) | 0;
  s = b + 32 | 0;
  i = n;
  r = s + 32 | 0;
  do {
   a[s >> 0] = a[i >> 0] | 0;
   s = s + 1 | 0;
   i = i + 1 | 0;
  } while ((s | 0) < (r | 0));
  ia(q, b, g, h) | 0;
  vb(q);
  Xa(m, q, l, p);
  qb(j, m);
  if (!(fa(j, o) | 0)) {
   i = Qb(g | 0, h | 0, -64, -1) | 0;
   j = x;
   Tb(b | 0, b + 64 | 0, i | 0) | 0;
   s = b + g + -64 | 0;
   r = s + 64 | 0;
   do {
    a[s >> 0] = 0;
    s = s + 1 | 0;
   } while ((s | 0) < (r | 0));
   s = e;
   c[s >> 2] = i;
   c[s + 4 >> 2] = j;
   s = 0;
   k = t;
   return s | 0;
  }
 }
 s = e;
 c[s >> 2] = -1;
 c[s + 4 >> 2] = -1;
 Ub(b | 0, 0, g | 0) | 0;
 s = -1;
 k = t;
 return s | 0;
}

function Aa(a, b, d, e, f, g, h, i, j) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 h = h | 0;
 i = i | 0;
 j = j | 0;
 var l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0;
 v = k;
 k = k + 1280 | 0;
 t = v + 1200 | 0;
 l = v + 1120 | 0;
 m = v + 960 | 0;
 n = v + 800 | 0;
 o = v + 640 | 0;
 p = v + 480 | 0;
 q = v + 320 | 0;
 r = v + 160 | 0;
 s = v;
 u = t;
 w = f;
 x = u + 80 | 0;
 do {
  c[u >> 2] = c[w >> 2];
  u = u + 4 | 0;
  w = w + 4 | 0;
 } while ((u | 0) < (x | 0));
 Ba(f, g);
 Ca(g, t);
 u = l;
 w = h;
 x = u + 80 | 0;
 do {
  c[u >> 2] = c[w >> 2];
  u = u + 4 | 0;
  w = w + 4 | 0;
 } while ((u | 0) < (x | 0));
 Ba(h, i);
 Ca(i, l);
 sa(p, h, g);
 sa(q, f, i);
 ta(p);
 ua(p);
 ta(q);
 ua(q);
 u = l;
 w = p;
 x = u + 80 | 0;
 do {
  c[u >> 2] = c[w >> 2];
  u = u + 4 | 0;
  w = w + 4 | 0;
 } while ((u | 0) < (x | 0));
 Ba(p, q);
 Ca(q, l);
 xa(s, p);
 xa(r, q);
 sa(q, r, j);
 ta(q);
 ua(q);
 u = d;
 w = s;
 x = u + 80 | 0;
 do {
  c[u >> 2] = c[w >> 2];
  u = u + 4 | 0;
  w = w + 4 | 0;
 } while ((u | 0) < (x | 0));
 u = e;
 w = q;
 x = u + 80 | 0;
 do {
  c[u >> 2] = c[w >> 2];
  u = u + 4 | 0;
  w = w + 4 | 0;
 } while ((u | 0) < (x | 0));
 xa(n, f);
 xa(o, g);
 sa(a, n, o);
 ta(a);
 ua(a);
 Ca(o, n);
 u = m + 80 | 0;
 x = u + 72 | 0;
 do {
  c[u >> 2] = 0;
  u = u + 4 | 0;
 } while ((u | 0) < (x | 0));
 Da(m, o);
 ua(m);
 Ba(m, n);
 sa(b, o, m);
 ta(b);
 ua(b);
 k = v;
 return;
}

function Sb(b, d, e) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0;
 if ((e | 0) >= 8192) return W(b | 0, d | 0, e | 0) | 0;
 h = b | 0;
 g = b + e | 0;
 if ((b & 3) == (d & 3)) {
  while (b & 3) {
   if (!e) return h | 0;
   a[b >> 0] = a[d >> 0] | 0;
   b = b + 1 | 0;
   d = d + 1 | 0;
   e = e - 1 | 0;
  }
  e = g & -4 | 0;
  f = e - 64 | 0;
  while ((b | 0) <= (f | 0)) {
   c[b >> 2] = c[d >> 2];
   c[b + 4 >> 2] = c[d + 4 >> 2];
   c[b + 8 >> 2] = c[d + 8 >> 2];
   c[b + 12 >> 2] = c[d + 12 >> 2];
   c[b + 16 >> 2] = c[d + 16 >> 2];
   c[b + 20 >> 2] = c[d + 20 >> 2];
   c[b + 24 >> 2] = c[d + 24 >> 2];
   c[b + 28 >> 2] = c[d + 28 >> 2];
   c[b + 32 >> 2] = c[d + 32 >> 2];
   c[b + 36 >> 2] = c[d + 36 >> 2];
   c[b + 40 >> 2] = c[d + 40 >> 2];
   c[b + 44 >> 2] = c[d + 44 >> 2];
   c[b + 48 >> 2] = c[d + 48 >> 2];
   c[b + 52 >> 2] = c[d + 52 >> 2];
   c[b + 56 >> 2] = c[d + 56 >> 2];
   c[b + 60 >> 2] = c[d + 60 >> 2];
   b = b + 64 | 0;
   d = d + 64 | 0;
  }
  while ((b | 0) < (e | 0)) {
   c[b >> 2] = c[d >> 2];
   b = b + 4 | 0;
   d = d + 4 | 0;
  }
 } else {
  e = g - 4 | 0;
  while ((b | 0) < (e | 0)) {
   a[b >> 0] = a[d >> 0] | 0;
   a[b + 1 >> 0] = a[d + 1 >> 0] | 0;
   a[b + 2 >> 0] = a[d + 2 >> 0] | 0;
   a[b + 3 >> 0] = a[d + 3 >> 0] | 0;
   b = b + 4 | 0;
   d = d + 4 | 0;
  }
 }
 while ((b | 0) < (g | 0)) {
  a[b >> 0] = a[d >> 0] | 0;
  b = b + 1 | 0;
  d = d + 1 | 0;
 }
 return h | 0;
}

function Da(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0;
 e = b;
 e = Mb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, 121665, 0) | 0;
 d = a;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 8 | 0;
 d = Mb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, 121665, 0) | 0;
 e = a + 8 | 0;
 c[e >> 2] = d;
 c[e + 4 >> 2] = x;
 e = b + 16 | 0;
 e = Mb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, 121665, 0) | 0;
 d = a + 16 | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 24 | 0;
 d = Mb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, 121665, 0) | 0;
 e = a + 24 | 0;
 c[e >> 2] = d;
 c[e + 4 >> 2] = x;
 e = b + 32 | 0;
 e = Mb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, 121665, 0) | 0;
 d = a + 32 | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 40 | 0;
 d = Mb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, 121665, 0) | 0;
 e = a + 40 | 0;
 c[e >> 2] = d;
 c[e + 4 >> 2] = x;
 e = b + 48 | 0;
 e = Mb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, 121665, 0) | 0;
 d = a + 48 | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 56 | 0;
 d = Mb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, 121665, 0) | 0;
 e = a + 56 | 0;
 c[e >> 2] = d;
 c[e + 4 >> 2] = x;
 e = b + 64 | 0;
 e = Mb(c[e >> 2] | 0, c[e + 4 >> 2] | 0, 121665, 0) | 0;
 d = a + 64 | 0;
 c[d >> 2] = e;
 c[d + 4 >> 2] = x;
 d = b + 72 | 0;
 d = Mb(c[d >> 2] | 0, c[d + 4 >> 2] | 0, 121665, 0) | 0;
 b = a + 72 | 0;
 c[b >> 2] = d;
 c[b + 4 >> 2] = x;
 return;
}

function fa(b, c) {
 b = b | 0;
 c = c | 0;
 return ((((a[c + 1 >> 0] ^ a[b + 1 >> 0] | a[c >> 0] ^ a[b >> 0] | a[c + 2 >> 0] ^ a[b + 2 >> 0] | a[c + 3 >> 0] ^ a[b + 3 >> 0] | a[c + 4 >> 0] ^ a[b + 4 >> 0] | a[c + 5 >> 0] ^ a[b + 5 >> 0] | a[c + 6 >> 0] ^ a[b + 6 >> 0] | a[c + 7 >> 0] ^ a[b + 7 >> 0] | a[c + 8 >> 0] ^ a[b + 8 >> 0] | a[c + 9 >> 0] ^ a[b + 9 >> 0] | a[c + 10 >> 0] ^ a[b + 10 >> 0] | a[c + 11 >> 0] ^ a[b + 11 >> 0] | a[c + 12 >> 0] ^ a[b + 12 >> 0] | a[c + 13 >> 0] ^ a[b + 13 >> 0] | a[c + 14 >> 0] ^ a[b + 14 >> 0] | a[c + 15 >> 0] ^ a[b + 15 >> 0] | a[c + 16 >> 0] ^ a[b + 16 >> 0] | a[c + 17 >> 0] ^ a[b + 17 >> 0] | a[c + 18 >> 0] ^ a[b + 18 >> 0] | a[c + 19 >> 0] ^ a[b + 19 >> 0] | a[c + 20 >> 0] ^ a[b + 20 >> 0] | a[c + 21 >> 0] ^ a[b + 21 >> 0] | a[c + 22 >> 0] ^ a[b + 22 >> 0] | a[c + 23 >> 0] ^ a[b + 23 >> 0] | a[c + 24 >> 0] ^ a[b + 24 >> 0] | a[c + 25 >> 0] ^ a[b + 25 >> 0] | a[c + 26 >> 0] ^ a[b + 26 >> 0] | a[c + 27 >> 0] ^ a[b + 27 >> 0] | a[c + 28 >> 0] ^ a[b + 28 >> 0] | a[c + 29 >> 0] ^ a[b + 29 >> 0] | a[c + 30 >> 0] ^ a[b + 30 >> 0] | a[c + 31 >> 0] ^ a[b + 31 >> 0]) & 255) + 511 | 0) >>> 8 & 1) + -1 | 0;
}

function Ha(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0, t = 0, u = 0, v = 0, w = 0, x = 0, y = 0, z = 0, A = 0, B = 0, C = 0, D = 0, E = 0, F = 0;
 E = c[a >> 2] | 0;
 B = a + 4 | 0;
 C = c[B >> 2] | 0;
 y = a + 8 | 0;
 z = c[y >> 2] | 0;
 v = a + 12 | 0;
 w = c[v >> 2] | 0;
 s = a + 16 | 0;
 t = c[s >> 2] | 0;
 p = a + 20 | 0;
 q = c[p >> 2] | 0;
 m = a + 24 | 0;
 n = c[m >> 2] | 0;
 j = a + 28 | 0;
 k = c[j >> 2] | 0;
 g = a + 32 | 0;
 h = c[g >> 2] | 0;
 e = a + 36 | 0;
 f = c[e >> 2] | 0;
 F = 0 - d | 0;
 D = (c[b + 4 >> 2] ^ C) & F;
 A = (c[b + 8 >> 2] ^ z) & F;
 x = (c[b + 12 >> 2] ^ w) & F;
 u = (c[b + 16 >> 2] ^ t) & F;
 r = (c[b + 20 >> 2] ^ q) & F;
 o = (c[b + 24 >> 2] ^ n) & F;
 l = (c[b + 28 >> 2] ^ k) & F;
 i = (c[b + 32 >> 2] ^ h) & F;
 d = (c[b + 36 >> 2] ^ f) & F;
 c[a >> 2] = (c[b >> 2] ^ E) & F ^ E;
 c[B >> 2] = D ^ C;
 c[y >> 2] = A ^ z;
 c[v >> 2] = x ^ w;
 c[s >> 2] = u ^ t;
 c[p >> 2] = r ^ q;
 c[m >> 2] = o ^ n;
 c[j >> 2] = l ^ k;
 c[g >> 2] = i ^ h;
 c[e >> 2] = d ^ f;
 return;
}

function Db(b, d, e, f, g) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 var h = 0, i = 0, j = 0;
 j = b + 192 | 0;
 h = c[j >> 2] & 127;
 i = 128 >>> e;
 a[b + h >> 0] = 0 - i & d | i;
 d = b + (h + 1) | 0;
 if (h >>> 0 > 111) {
  Ub(d | 0, 0, h ^ 127 | 0) | 0;
  i = b + 128 | 0;
  Ab(b, i);
  d = b;
  h = d + 112 | 0;
  do {
   c[d >> 2] = 0;
   d = d + 4 | 0;
  } while ((d | 0) < (h | 0));
  d = i;
  h = i;
 } else {
  Ub(d | 0, 0, 111 - h | 0) | 0;
  h = b + 128 | 0;
  d = h;
 }
 i = j;
 i = Ob(c[i >> 2] | 0, c[i + 4 >> 2] | 0, 61) | 0;
 Eb(b + 112 | 0, i, x);
 j = Pb(c[j >> 2] | 0, c[j + 4 >> 2] | 0, 3) | 0;
 j = Qb(j | 0, x | 0, e | 0, 0) | 0;
 Eb(b + 120 | 0, j, x);
 Ab(b, d);
 if (!g) return;
 d = 0;
 do {
  j = h + (d << 3) | 0;
  Fb(f + (d << 3) | 0, c[j >> 2] | 0, c[j + 4 >> 2] | 0);
  d = d + 1 | 0;
 } while ((d | 0) != (g | 0));
 return;
}

function ha(b, c, d, e) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
 n = k;
 k = k + 320 | 0;
 s = n + 272 | 0;
 p = n + 224 | 0;
 q = n + 176 | 0;
 o = n + 128 | 0;
 r = n + 80 | 0;
 f = n + 32 | 0;
 g = n;
 h = n + 312 | 0;
 i = e + 64 | 0;
 j = Y() | 0;
 l = k;
 k = k + ((1 * i | 0) + 15 & -16) | 0;
 m = k;
 k = k + ((1 * i | 0) + 15 & -16) | 0;
 Ja(s, c);
 Fa(r);
 Ua(p, s, r);
 Ga(q, s, r);
 Ma(o, q);
 Pa(f, p, o);
 Va(g, f);
 f = b + 63 | 0;
 c = a[f >> 0] | 0;
 o = g + 31 | 0;
 a[o >> 0] = a[o >> 0] | c & -128;
 a[f >> 0] = c & 127;
 f = l;
 c = f + 64 | 0;
 do {
  a[f >> 0] = a[b >> 0] | 0;
  f = f + 1 | 0;
  b = b + 1 | 0;
 } while ((f | 0) < (c | 0));
 Sb(l + 64 | 0, d | 0, e | 0) | 0;
 s = rb(m, h, l, i, 0, g) | 0;
 X(j | 0);
 k = n;
 return s | 0;
}

function Ua(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
 m = (c[b + 4 >> 2] | 0) - (c[d + 4 >> 2] | 0) | 0;
 l = (c[b + 8 >> 2] | 0) - (c[d + 8 >> 2] | 0) | 0;
 k = (c[b + 12 >> 2] | 0) - (c[d + 12 >> 2] | 0) | 0;
 j = (c[b + 16 >> 2] | 0) - (c[d + 16 >> 2] | 0) | 0;
 i = (c[b + 20 >> 2] | 0) - (c[d + 20 >> 2] | 0) | 0;
 h = (c[b + 24 >> 2] | 0) - (c[d + 24 >> 2] | 0) | 0;
 g = (c[b + 28 >> 2] | 0) - (c[d + 28 >> 2] | 0) | 0;
 f = (c[b + 32 >> 2] | 0) - (c[d + 32 >> 2] | 0) | 0;
 e = (c[b + 36 >> 2] | 0) - (c[d + 36 >> 2] | 0) | 0;
 c[a >> 2] = (c[b >> 2] | 0) - (c[d >> 2] | 0);
 c[a + 4 >> 2] = m;
 c[a + 8 >> 2] = l;
 c[a + 12 >> 2] = k;
 c[a + 16 >> 2] = j;
 c[a + 20 >> 2] = i;
 c[a + 24 >> 2] = h;
 c[a + 28 >> 2] = g;
 c[a + 32 >> 2] = f;
 c[a + 36 >> 2] = e;
 return;
}

function Ga(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0, m = 0;
 m = (c[d + 4 >> 2] | 0) + (c[b + 4 >> 2] | 0) | 0;
 l = (c[d + 8 >> 2] | 0) + (c[b + 8 >> 2] | 0) | 0;
 k = (c[d + 12 >> 2] | 0) + (c[b + 12 >> 2] | 0) | 0;
 j = (c[d + 16 >> 2] | 0) + (c[b + 16 >> 2] | 0) | 0;
 i = (c[d + 20 >> 2] | 0) + (c[b + 20 >> 2] | 0) | 0;
 h = (c[d + 24 >> 2] | 0) + (c[b + 24 >> 2] | 0) | 0;
 g = (c[d + 28 >> 2] | 0) + (c[b + 28 >> 2] | 0) | 0;
 f = (c[d + 32 >> 2] | 0) + (c[b + 32 >> 2] | 0) | 0;
 e = (c[d + 36 >> 2] | 0) + (c[b + 36 >> 2] | 0) | 0;
 c[a >> 2] = (c[d >> 2] | 0) + (c[b >> 2] | 0);
 c[a + 4 >> 2] = m;
 c[a + 8 >> 2] = l;
 c[a + 12 >> 2] = k;
 c[a + 16 >> 2] = j;
 c[a + 20 >> 2] = i;
 c[a + 24 >> 2] = h;
 c[a + 28 >> 2] = g;
 c[a + 32 >> 2] = f;
 c[a + 36 >> 2] = e;
 return;
}

function Ub(b, d, e) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 var f = 0, g = 0, h = 0, i = 0;
 h = b + e | 0;
 d = d & 255;
 if ((e | 0) >= 67) {
  while (b & 3) {
   a[b >> 0] = d;
   b = b + 1 | 0;
  }
  f = h & -4 | 0;
  g = f - 64 | 0;
  i = d | d << 8 | d << 16 | d << 24;
  while ((b | 0) <= (g | 0)) {
   c[b >> 2] = i;
   c[b + 4 >> 2] = i;
   c[b + 8 >> 2] = i;
   c[b + 12 >> 2] = i;
   c[b + 16 >> 2] = i;
   c[b + 20 >> 2] = i;
   c[b + 24 >> 2] = i;
   c[b + 28 >> 2] = i;
   c[b + 32 >> 2] = i;
   c[b + 36 >> 2] = i;
   c[b + 40 >> 2] = i;
   c[b + 44 >> 2] = i;
   c[b + 48 >> 2] = i;
   c[b + 52 >> 2] = i;
   c[b + 56 >> 2] = i;
   c[b + 60 >> 2] = i;
   b = b + 64 | 0;
  }
  while ((b | 0) < (f | 0)) {
   c[b >> 2] = i;
   b = b + 4 | 0;
  }
 }
 while ((b | 0) < (h | 0)) {
  a[b >> 0] = d;
  b = b + 1 | 0;
 }
 return h - e | 0;
}

function ja(b, d, e, f, g, h) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 g = g | 0;
 h = h | 0;
 var i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0, q = 0, r = 0, s = 0;
 q = k;
 k = k + 320 | 0;
 l = q + 128 | 0;
 m = q + 64 | 0;
 n = q;
 o = q + 160 | 0;
 p = l;
 r = h + 32 | 0;
 s = p + 32 | 0;
 do {
  a[p >> 0] = a[r >> 0] | 0;
  p = p + 1 | 0;
  r = r + 1 | 0;
 } while ((p | 0) < (s | 0));
 i = Qb(f | 0, g | 0, 64, 0) | 0;
 j = x;
 c[d >> 2] = i;
 c[d + 4 >> 2] = j;
 Tb(b + 64 | 0, e | 0, f | 0) | 0;
 d = b + 32 | 0;
 Tb(d | 0, h | 0, 32) | 0;
 p = Qb(f | 0, g | 0, 32, 0) | 0;
 ia(m, d, p, x) | 0;
 p = d;
 r = l;
 s = p + 32 | 0;
 do {
  a[p >> 0] = a[r >> 0] | 0;
  p = p + 1 | 0;
  r = r + 1 | 0;
 } while ((p | 0) < (s | 0));
 vb(m);
 kb(o, m);
 ib(b, o);
 ia(n, b, i, j) | 0;
 vb(n);
 sb(d, n, h, m);
 k = q;
 return 0;
}

function ga(b, d, e, f) {
 b = b | 0;
 d = d | 0;
 e = e | 0;
 f = f | 0;
 var g = 0, h = 0, i = 0, j = 0, l = 0, m = 0, n = 0, o = 0, p = 0;
 n = k;
 k = k + 240 | 0;
 g = n + 72 | 0;
 h = n;
 i = n + 64 | 0;
 j = Y() | 0;
 l = k;
 k = k + ((1 * (f + 64 | 0) | 0) + 15 & -16) | 0;
 m = i;
 c[m >> 2] = 0;
 c[m + 4 >> 2] = 0;
 m = h;
 o = d;
 p = m + 32 | 0;
 do {
  a[m >> 0] = a[o >> 0] | 0;
  m = m + 1 | 0;
  o = o + 1 | 0;
 } while ((m | 0) < (p | 0));
 kb(g, d);
 ib(h + 32 | 0, g);
 d = a[h + 63 >> 0] & -128;
 ja(l, i, e, f, 0, h) | 0;
 m = b;
 o = l;
 p = m + 64 | 0;
 do {
  a[m >> 0] = a[o >> 0] | 0;
  m = m + 1 | 0;
  o = o + 1 | 0;
 } while ((m | 0) < (p | 0));
 p = b + 63 | 0;
 a[p >> 0] = a[p >> 0] | d;
 X(j | 0);
 k = n;
 return;
}

function Za(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0;
 h = k;
 k = k + 240 | 0;
 c = h + 192 | 0;
 i = h + 144 | 0;
 j = h + 96 | 0;
 e = h + 48 | 0;
 f = h;
 g = a + 40 | 0;
 Ja(g, b);
 l = a + 80 | 0;
 Fa(l);
 Sa(c, g);
 Pa(i, c, 976);
 Ua(c, c, l);
 Ga(i, i, l);
 Sa(j, i);
 Pa(j, j, i);
 Sa(a, j);
 Pa(a, a, i);
 Pa(a, a, c);
 Ra(a, a);
 Pa(a, a, j);
 Pa(a, a, c);
 Sa(e, a);
 Pa(e, e, i);
 Ua(f, e, c);
 do if (Oa(f) | 0) {
  Ga(f, e, c);
  if (!(Oa(f) | 0)) {
   Pa(a, a, 1024);
   break;
  } else {
   l = -1;
   k = h;
   return l | 0;
  }
 } while (0);
 l = Na(a) | 0;
 if ((l | 0) == ((d[b + 31 >> 0] | 0) >>> 7 | 0)) Qa(a, a);
 Pa(a + 120 | 0, a, g);
 l = 0;
 k = h;
 return l | 0;
}

function lb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0, e = 0, f = 0;
 d = k;
 k = k + 128 | 0;
 f = d;
 e = mb(c) | 0;
 c = c << 24 >> 24;
 c = c - ((0 - (e & 255) & c) << 1) & 255;
 jb(a);
 ob(a, 1120 + (b * 960 | 0) | 0, nb(c, 1) | 0);
 ob(a, 1120 + (b * 960 | 0) + 120 | 0, nb(c, 2) | 0);
 ob(a, 1120 + (b * 960 | 0) + 240 | 0, nb(c, 3) | 0);
 ob(a, 1120 + (b * 960 | 0) + 360 | 0, nb(c, 4) | 0);
 ob(a, 1120 + (b * 960 | 0) + 480 | 0, nb(c, 5) | 0);
 ob(a, 1120 + (b * 960 | 0) + 600 | 0, nb(c, 6) | 0);
 ob(a, 1120 + (b * 960 | 0) + 720 | 0, nb(c, 7) | 0);
 ob(a, 1120 + (b * 960 | 0) + 840 | 0, nb(c, 8) | 0);
 Ia(f, a + 40 | 0);
 Ia(f + 40 | 0, a);
 Qa(f + 80 | 0, a + 80 | 0);
 ob(a, f, e);
 k = d;
 return;
}

function Qa(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
 l = 0 - (c[b + 4 >> 2] | 0) | 0;
 k = 0 - (c[b + 8 >> 2] | 0) | 0;
 j = 0 - (c[b + 12 >> 2] | 0) | 0;
 i = 0 - (c[b + 16 >> 2] | 0) | 0;
 h = 0 - (c[b + 20 >> 2] | 0) | 0;
 g = 0 - (c[b + 24 >> 2] | 0) | 0;
 f = 0 - (c[b + 28 >> 2] | 0) | 0;
 e = 0 - (c[b + 32 >> 2] | 0) | 0;
 d = 0 - (c[b + 36 >> 2] | 0) | 0;
 c[a >> 2] = 0 - (c[b >> 2] | 0);
 c[a + 4 >> 2] = l;
 c[a + 8 >> 2] = k;
 c[a + 12 >> 2] = j;
 c[a + 16 >> 2] = i;
 c[a + 20 >> 2] = h;
 c[a + 24 >> 2] = g;
 c[a + 28 >> 2] = f;
 c[a + 32 >> 2] = e;
 c[a + 36 >> 2] = d;
 return;
}

function Ia(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, k = 0, l = 0;
 l = c[b + 4 >> 2] | 0;
 k = c[b + 8 >> 2] | 0;
 j = c[b + 12 >> 2] | 0;
 i = c[b + 16 >> 2] | 0;
 h = c[b + 20 >> 2] | 0;
 g = c[b + 24 >> 2] | 0;
 f = c[b + 28 >> 2] | 0;
 e = c[b + 32 >> 2] | 0;
 d = c[b + 36 >> 2] | 0;
 c[a >> 2] = c[b >> 2];
 c[a + 4 >> 2] = l;
 c[a + 8 >> 2] = k;
 c[a + 12 >> 2] = j;
 c[a + 16 >> 2] = i;
 c[a + 20 >> 2] = h;
 c[a + 24 >> 2] = g;
 c[a + 28 >> 2] = f;
 c[a + 32 >> 2] = e;
 c[a + 36 >> 2] = d;
 return;
}

function zb(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0;
 h = a + 192 | 0;
 if (!d) return;
 g = a + 128 | 0;
 e = c[h >> 2] & 127;
 while (1) {
  f = 128 - e | 0;
  f = f >>> 0 > d >>> 0 ? d : f;
  Sb(a + e | 0, b | 0, f | 0) | 0;
  e = f + e | 0;
  d = d - f | 0;
  if ((e | 0) == 128) {
   Ab(a, g);
   e = 0;
  }
  j = h;
  j = Qb(c[j >> 2] | 0, c[j + 4 >> 2] | 0, f | 0, 0) | 0;
  i = h;
  c[i >> 2] = j;
  c[i + 4 >> 2] = x;
  if (!d) break; else b = b + f | 0;
 }
 return;
}

function Bb(a) {
 a = a | 0;
 var b = 0, c = 0, e = 0, f = 0, g = 0, h = 0, i = 0;
 g = Pb(d[a >> 0] | 0 | 0, 0, 56) | 0;
 i = x;
 h = Pb(d[a + 1 >> 0] | 0 | 0, 0, 48) | 0;
 i = x | i;
 f = Pb(d[a + 2 >> 0] | 0 | 0, 0, 40) | 0;
 i = i | x | (d[a + 3 >> 0] | 0);
 e = Pb(d[a + 4 >> 0] | 0 | 0, 0, 24) | 0;
 i = i | x;
 c = Pb(d[a + 5 >> 0] | 0 | 0, 0, 16) | 0;
 i = i | x;
 b = Pb(d[a + 6 >> 0] | 0 | 0, 0, 8) | 0;
 x = i | x;
 return h | g | f | e | c | b | (d[a + 7 >> 0] | 0) | 0;
}

function ka(b, c, d) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0, f = 0, g = 0, h = 0, i = 0, j = 0, l = 0, m = 0;
 m = k;
 k = k + 368 | 0;
 f = m + 288 | 0;
 g = m + 208 | 0;
 h = m + 112 | 0;
 i = m + 32 | 0;
 j = m;
 l = j;
 e = l + 32 | 0;
 do {
  a[l >> 0] = a[c >> 0] | 0;
  l = l + 1 | 0;
  c = c + 1 | 0;
 } while ((l | 0) < (e | 0));
 la(f, d);
 ma(g, h, j, f);
 na(i, h);
 oa(h, g, i);
 pa(b, h);
 k = m;
 return 0;
}

function Fb(b, c, d) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0;
 e = Ob(c | 0, d | 0, 56) | 0;
 a[b >> 0] = e;
 e = Ob(c | 0, d | 0, 48) | 0;
 a[b + 1 >> 0] = e;
 e = Ob(c | 0, d | 0, 40) | 0;
 a[b + 2 >> 0] = e;
 a[b + 3 >> 0] = d;
 e = Ob(c | 0, d | 0, 24) | 0;
 a[b + 4 >> 0] = e;
 e = Ob(c | 0, d | 0, 16) | 0;
 a[b + 5 >> 0] = e;
 d = Ob(c | 0, d | 0, 8) | 0;
 a[b + 6 >> 0] = d;
 a[b + 7 >> 0] = c;
 return;
}

function Eb(b, c, d) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0;
 e = Ob(c | 0, d | 0, 56) | 0;
 a[b >> 0] = e;
 e = Ob(c | 0, d | 0, 48) | 0;
 a[b + 1 >> 0] = e;
 e = Ob(c | 0, d | 0, 40) | 0;
 a[b + 2 >> 0] = e;
 a[b + 3 >> 0] = d;
 e = Ob(c | 0, d | 0, 24) | 0;
 a[b + 4 >> 0] = e;
 e = Ob(c | 0, d | 0, 16) | 0;
 a[b + 5 >> 0] = e;
 d = Ob(c | 0, d | 0, 8) | 0;
 a[b + 6 >> 0] = d;
 a[b + 7 >> 0] = c;
 return;
}

function pb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0;
 d = k;
 k = k + 48 | 0;
 f = d;
 g = b + 40 | 0;
 Ga(a, g, b);
 h = a + 40 | 0;
 Ua(h, g, b);
 g = a + 80 | 0;
 Pa(g, a, c + 40 | 0);
 Pa(h, h, c);
 e = a + 120 | 0;
 Pa(e, c + 120 | 0, b + 120 | 0);
 Pa(a, b + 80 | 0, c + 80 | 0);
 Ga(f, a, a);
 Ua(a, g, h);
 Ga(h, g, h);
 Ua(g, f, e);
 Ga(e, f, e);
 k = d;
 return;
}

function Wa(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0;
 d = k;
 k = k + 48 | 0;
 f = d;
 g = b + 40 | 0;
 Ga(a, g, b);
 h = a + 40 | 0;
 Ua(h, g, b);
 g = a + 80 | 0;
 Pa(g, a, c);
 Pa(h, h, c + 40 | 0);
 e = a + 120 | 0;
 Pa(e, c + 120 | 0, b + 120 | 0);
 Pa(a, b + 80 | 0, c + 80 | 0);
 Ga(f, a, a);
 Ua(a, g, h);
 Ga(h, g, h);
 Ga(g, f, e);
 Ua(e, f, e);
 k = d;
 return;
}

function _a(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0;
 d = k;
 k = k + 48 | 0;
 f = d;
 g = b + 40 | 0;
 Ga(a, g, b);
 h = a + 40 | 0;
 Ua(h, g, b);
 g = a + 80 | 0;
 Pa(g, a, c);
 Pa(h, h, c + 40 | 0);
 e = a + 120 | 0;
 Pa(e, c + 80 | 0, b + 120 | 0);
 c = b + 80 | 0;
 Ga(f, c, c);
 Ua(a, g, h);
 Ga(h, g, h);
 Ga(g, f, e);
 Ua(e, f, e);
 k = d;
 return;
}

function $a(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0, e = 0, f = 0, g = 0, h = 0;
 d = k;
 k = k + 48 | 0;
 f = d;
 g = b + 40 | 0;
 Ga(a, g, b);
 h = a + 40 | 0;
 Ua(h, g, b);
 g = a + 80 | 0;
 Pa(g, a, c + 40 | 0);
 Pa(h, h, c);
 e = a + 120 | 0;
 Pa(e, c + 80 | 0, b + 120 | 0);
 c = b + 80 | 0;
 Ga(f, c, c);
 Ua(a, g, h);
 Ga(h, g, h);
 Ua(g, f, e);
 Ga(e, f, e);
 k = d;
 return;
}

function Kb() {}
function Lb(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0;
 f = a & 65535;
 e = b & 65535;
 c = M(e, f) | 0;
 d = a >>> 16;
 a = (c >>> 16) + (M(e, d) | 0) | 0;
 e = b >>> 16;
 b = M(e, f) | 0;
 return (x = (a >>> 16) + (M(e, d) | 0) + (((a & 65535) + b | 0) >>> 16) | 0, a + b << 16 | c & 65535 | 0) | 0;
}

function db(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0, f = 0, g = 0, h = 0;
 c = k;
 k = k + 48 | 0;
 g = c;
 Sa(a, b);
 d = a + 80 | 0;
 h = b + 40 | 0;
 Sa(d, h);
 e = a + 120 | 0;
 Ta(e, b + 80 | 0);
 f = a + 40 | 0;
 Ga(f, b, h);
 Sa(g, f);
 Ga(f, d, a);
 Ua(d, d, a);
 Ua(a, g, f);
 Ua(e, e, d);
 k = c;
 return;
}

function Tb(b, c, d) {
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0;
 if ((c | 0) < (b | 0) & (b | 0) < (c + d | 0)) {
  e = b;
  c = c + d | 0;
  b = b + d | 0;
  while ((d | 0) > 0) {
   b = b - 1 | 0;
   c = c - 1 | 0;
   d = d - 1 | 0;
   a[b >> 0] = a[c >> 0] | 0;
  }
  b = e;
 } else Sb(b, c, d) | 0;
 return b | 0;
}

function qb(b, c) {
 b = b | 0;
 c = c | 0;
 var e = 0, f = 0, g = 0, h = 0;
 e = k;
 k = k + 144 | 0;
 h = e + 96 | 0;
 f = e + 48 | 0;
 g = e;
 Ma(h, c + 80 | 0);
 Pa(f, c, h);
 Pa(g, c + 40 | 0, h);
 Va(b, g);
 f = (Na(f) | 0) << 7;
 c = b + 31 | 0;
 a[c >> 0] = f ^ (d[c >> 0] | 0);
 k = e;
 return;
}

function ib(b, c) {
 b = b | 0;
 c = c | 0;
 var e = 0, f = 0, g = 0, h = 0;
 e = k;
 k = k + 144 | 0;
 h = e + 96 | 0;
 f = e + 48 | 0;
 g = e;
 Ma(h, c + 80 | 0);
 Pa(f, c, h);
 Pa(g, c + 40 | 0, h);
 Va(b, g);
 f = (Na(f) | 0) << 7;
 c = b + 31 | 0;
 a[c >> 0] = f ^ (d[c >> 0] | 0);
 k = e;
 return;
}

function Vb(a) {
 a = a | 0;
 var b = 0, d = 0;
 d = c[i >> 2] | 0;
 b = d + a | 0;
 if ((a | 0) > 0 & (b | 0) < (d | 0) | (b | 0) < 0) {
  U() | 0;
  V(12);
  return -1;
 }
 c[i >> 2] = b;
 if ((b | 0) > (T() | 0)) if (!(S() | 0)) {
  c[i >> 2] = d;
  V(12);
  return -1;
 }
 return d | 0;
}

function oa(a, b, d) {
 a = a | 0;
 b = b | 0;
 d = d | 0;
 var e = 0, f = 0;
 e = k;
 k = k + 160 | 0;
 f = e;
 sa(f, b, d);
 ta(f);
 ua(f);
 b = f;
 d = a + 80 | 0;
 do {
  c[a >> 2] = c[b >> 2];
  a = a + 4 | 0;
  b = b + 4 | 0;
 } while ((a | 0) < (d | 0));
 k = e;
 return;
}

function xb(a) {
 a = a | 0;
 var b = 0, c = 0, e = 0, f = 0;
 c = d[a >> 0] | 0;
 e = Pb(d[a + 1 >> 0] | 0 | 0, 0, 8) | 0;
 f = x;
 b = Pb(d[a + 2 >> 0] | 0 | 0, 0, 16) | 0;
 f = f | x;
 a = Pb(d[a + 3 >> 0] | 0 | 0, 0, 24) | 0;
 x = f | x;
 return e | c | b | a | 0;
}

function ub(a) {
 a = a | 0;
 var b = 0, c = 0, e = 0, f = 0;
 c = d[a >> 0] | 0;
 e = Pb(d[a + 1 >> 0] | 0 | 0, 0, 8) | 0;
 f = x;
 b = Pb(d[a + 2 >> 0] | 0 | 0, 0, 16) | 0;
 f = f | x;
 a = Pb(d[a + 3 >> 0] | 0 | 0, 0, 24) | 0;
 x = f | x;
 return e | c | b | a | 0;
}

function Ka(a) {
 a = a | 0;
 var b = 0, c = 0, e = 0, f = 0;
 c = d[a >> 0] | 0;
 e = Pb(d[a + 1 >> 0] | 0 | 0, 0, 8) | 0;
 f = x;
 b = Pb(d[a + 2 >> 0] | 0 | 0, 0, 16) | 0;
 f = f | x;
 a = Pb(d[a + 3 >> 0] | 0 | 0, 0, 24) | 0;
 x = f | x;
 return e | c | b | a | 0;
}

function xa(a, b) {
 a = a | 0;
 b = b | 0;
 var d = 0, e = 0;
 e = k;
 k = k + 160 | 0;
 d = e;
 ya(d, b);
 ta(d);
 ua(d);
 b = d;
 d = a + 80 | 0;
 do {
  c[a >> 2] = c[b >> 2];
  a = a + 4 | 0;
  b = b + 4 | 0;
 } while ((a | 0) < (d | 0));
 k = e;
 return;
}

function yb(a) {
 a = a | 0;
 var b = 0, d = 0, e = 0;
 b = a + 128 | 0;
 d = 31840;
 e = b + 64 | 0;
 do {
  c[b >> 2] = c[d >> 2];
  b = b + 4 | 0;
  d = d + 4 | 0;
 } while ((b | 0) < (e | 0));
 e = a + 192 | 0;
 c[e >> 2] = 0;
 c[e + 4 >> 2] = 0;
 return;
}

function bb(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0, e = 0;
 d = b + 120 | 0;
 Pa(a, b, d);
 c = b + 40 | 0;
 e = b + 80 | 0;
 Pa(a + 40 | 0, c, e);
 Pa(a + 80 | 0, e, d);
 Pa(a + 120 | 0, b, c);
 return;
}

function Mb(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0, f = 0;
 e = a;
 f = c;
 c = Lb(e, f) | 0;
 a = x;
 return (x = (M(b, f) | 0) + (M(d, e) | 0) + a | a & 0, c | 0 | 0) | 0;
}

function Nb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 if ((c | 0) < 32) {
  x = b >> c;
  return a >>> c | (b & (1 << c) - 1) << 32 - c;
 }
 x = (b | 0) < 0 ? -1 : 0;
 return b >> c - 32 | 0;
}

function wb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0;
 b = Pb(b & 255 | 0, 0, 8) | 0;
 d = x;
 c = Pb(c & 255 | 0, 0, 16) | 0;
 x = d | x;
 return b | a & 255 | c | 0;
}

function tb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0;
 b = Pb(b & 255 | 0, 0, 8) | 0;
 d = x;
 c = Pb(c & 255 | 0, 0, 16) | 0;
 x = d | x;
 return b | a & 255 | c | 0;
}

function gb(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0;
 c = b + 40 | 0;
 Ga(a, c, b);
 Ua(a + 40 | 0, c, b);
 Ia(a + 80 | 0, b + 80 | 0);
 Pa(a + 120 | 0, b + 120 | 0, 1072);
 return;
}

function Pb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 if ((c | 0) < 32) {
  x = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c;
  return a << c;
 }
 x = a << c - 32;
 return 0;
}

function La(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 var d = 0;
 b = Pb(b & 255 | 0, 0, 8) | 0;
 d = x;
 c = Pb(c & 255 | 0, 0, 16) | 0;
 x = d | x;
 return b | a & 255 | c | 0;
}

function Ob(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 if ((c | 0) < 32) {
  x = b >>> c;
  return a >>> c | (b & (1 << c) - 1) << 32 - c;
 }
 x = 0;
 return b >>> c - 32 | 0;
}

function ab(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0;
 c = b + 120 | 0;
 Pa(a, b, c);
 d = b + 80 | 0;
 Pa(a + 40 | 0, b + 40 | 0, d);
 Pa(a + 80 | 0, d, c);
 return;
}

function ia(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 var e = 0;
 d = k;
 k = k + 208 | 0;
 e = d;
 yb(e);
 zb(e, b, c);
 Gb(e, a);
 k = d;
 return 0;
}

function Fa(a) {
 a = a | 0;
 var b = 0;
 c[a >> 2] = 1;
 a = a + 4 | 0;
 b = a + 36 | 0;
 do {
  c[a >> 2] = 0;
  a = a + 4 | 0;
 } while ((a | 0) < (b | 0));
 return;
}

function ob(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 c = c & 255;
 Ha(a, b, c);
 Ha(a + 40 | 0, b + 40 | 0, c);
 Ha(a + 80 | 0, b + 80 | 0, c);
 return;
}

function ra(a, b) {
 a = a | 0;
 b = b | 0;
 b = ~a ^ b;
 b = b << 16 & b;
 b = b << 8 & b;
 b = b << 4 & b;
 b = b << 2 & b;
 return (b << 1 & b) >> 31 | 0;
}

function Rb(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 d = b - d - (c >>> 0 > a >>> 0 | 0) >>> 0;
 return (x = d, a - c >>> 0 | 0) | 0;
}

function Qb(a, b, c, d) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 d = d | 0;
 c = a + c >>> 0;
 return (x = b + d + (c >>> 0 < a >>> 0 | 0) >>> 0, c | 0) | 0;
}

function wa(a, b) {
 a = a | 0;
 b = b | 0;
 b = Qb(b >> 31 >>> 7 | 0, 0, a | 0, b | 0) | 0;
 b = Nb(b | 0, x | 0, 25) | 0;
 return b | 0;
}

function va(a, b) {
 a = a | 0;
 b = b | 0;
 b = Qb(b >> 31 >>> 6 | 0, 0, a | 0, b | 0) | 0;
 b = Nb(b | 0, x | 0, 26) | 0;
 return b | 0;
}

function Oa(a) {
 a = a | 0;
 var b = 0, c = 0;
 b = k;
 k = k + 32 | 0;
 c = b;
 Va(c, a);
 a = fa(c, 32544) | 0;
 k = b;
 return a | 0;
}

function Ea(a) {
 a = a | 0;
 var b = 0;
 b = a + 40 | 0;
 do {
  c[a >> 2] = 0;
  a = a + 4 | 0;
 } while ((a | 0) < (b | 0));
 return;
}

function fb(a, b) {
 a = a | 0;
 b = b | 0;
 var c = 0, d = 0;
 c = k;
 k = k + 128 | 0;
 d = c;
 hb(d, b);
 db(a, d);
 k = c;
 return;
}

function Na(b) {
 b = b | 0;
 var c = 0, d = 0;
 d = k;
 k = k + 32 | 0;
 c = d;
 Va(c, b);
 k = d;
 return a[c >> 0] & 1 | 0;
}

function hb(a, b) {
 a = a | 0;
 b = b | 0;
 Ia(a, b);
 Ia(a + 40 | 0, b + 40 | 0);
 Ia(a + 80 | 0, b + 80 | 0);
 return;
}

function eb(a) {
 a = a | 0;
 Ea(a);
 Fa(a + 40 | 0);
 Fa(a + 80 | 0);
 Ea(a + 120 | 0);
 return;
}

function nb(a, b) {
 a = a | 0;
 b = b | 0;
 return (((b ^ a) & 255) + -1 | 0) >>> 31 & 255 | 0;
}
function _(a) {
 a = a | 0;
 var b = 0;
 b = k;
 k = k + a | 0;
 k = k + 15 & -16;
 return b | 0;
}

function Cb(a, b, c) {
 a = a | 0;
 b = b | 0;
 c = c | 0;
 Db(a, 0, 0, b, c);
 return;
}

function jb(a) {
 a = a | 0;
 Fa(a);
 Fa(a + 40 | 0);
 Ea(a + 80 | 0);
 return;
}

function cb(a) {
 a = a | 0;
 Ea(a);
 Fa(a + 40 | 0);
 Fa(a + 80 | 0);
 return;
}

function ca(a, b) {
 a = a | 0;
 b = b | 0;
 if (!m) {
  m = a;
  n = b;
 }
}

function Gb(a, b) {
 a = a | 0;
 b = b | 0;
 Cb(a, b, 8);
 yb(a);
 return;
}

function qa(a) {
 a = a | 0;
 return ~(a + -67108845 >> 31) | 0;
}

function ba(a, b) {
 a = a | 0;
 b = b | 0;
 k = a;
 l = b;
}

function mb(a) {
 a = a | 0;
 return (a & 255) >>> 7 | 0;
}

function da(a) {
 a = a | 0;
 x = a;
}

function aa(a) {
 a = a | 0;
 k = a;
}

function ea() {
 return x | 0;
}

function Jb() {
 return 33072;
}

function $() {
 return k | 0;
}

// EMSCRIPTEN_END_FUNCS

 return {
  ___errno_location: Jb,
  ___muldi3: Mb,
  _bitshift64Ashr: Nb,
  _bitshift64Lshr: Ob,
  _bitshift64Shl: Pb,
  _crypto_sign_ed25519_ref10_ge_scalarmult_base: kb,
  _curve25519_donna: ka,
  _curve25519_sign: ga,
  _curve25519_verify: ha,
  _free: Ib,
  _i64Add: Qb,
  _i64Subtract: Rb,
  _malloc: Hb,
  _memcpy: Sb,
  _memmove: Tb,
  _memset: Ub,
  _sbrk: Vb,
  _sph_sha512_init: yb,
  establishStackSpace: ba,
  getTempRet0: ea,
  runPostSets: Kb,
  setTempRet0: da,
  setThrew: ca,
  stackAlloc: _,
  stackRestore: aa,
  stackSave: $
 };
})


// EMSCRIPTEN_END_ASM
(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
var ___muldi3 = Module["___muldi3"] = asm["___muldi3"];
var _bitshift64Ashr = Module["_bitshift64Ashr"] = asm["_bitshift64Ashr"];
var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
var _crypto_sign_ed25519_ref10_ge_scalarmult_base = Module["_crypto_sign_ed25519_ref10_ge_scalarmult_base"] = asm["_crypto_sign_ed25519_ref10_ge_scalarmult_base"];
var _curve25519_donna = Module["_curve25519_donna"] = asm["_curve25519_donna"];
var _curve25519_sign = Module["_curve25519_sign"] = asm["_curve25519_sign"];
var _curve25519_verify = Module["_curve25519_verify"] = asm["_curve25519_verify"];
var _free = Module["_free"] = asm["_free"];
var _i64Add = Module["_i64Add"] = asm["_i64Add"];
var _i64Subtract = Module["_i64Subtract"] = asm["_i64Subtract"];
var _malloc = Module["_malloc"] = asm["_malloc"];
var _memcpy = Module["_memcpy"] = asm["_memcpy"];
var _memmove = Module["_memmove"] = asm["_memmove"];
var _memset = Module["_memset"] = asm["_memset"];
var _sbrk = Module["_sbrk"] = asm["_sbrk"];
var _sph_sha512_init = Module["_sph_sha512_init"] = asm["_sph_sha512_init"];
var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
var runPostSets = Module["runPostSets"] = asm["runPostSets"];
var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
var setThrew = Module["setThrew"] = asm["setThrew"];
var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
var stackRestore = Module["stackRestore"] = asm["stackRestore"];
var stackSave = Module["stackSave"] = asm["stackSave"];
Module["asm"] = asm;
if (memoryInitializer) {
 if (!isDataURI(memoryInitializer)) {
  memoryInitializer = locateFile(memoryInitializer);
 }
 if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
  var data = Module["readBinary"](memoryInitializer);
  HEAPU8.set(data, GLOBAL_BASE);
 } else {
  addRunDependency("memory initializer");
  var applyMemoryInitializer = (function(data) {
   if (data.byteLength) data = new Uint8Array(data);
   HEAPU8.set(data, GLOBAL_BASE);
   if (Module["memoryInitializerRequest"]) delete Module["memoryInitializerRequest"].response;
   removeRunDependency("memory initializer");
  });
  function doBrowserLoad() {
   Module["readAsync"](memoryInitializer, applyMemoryInitializer, (function() {
    throw "could not load memory initializer " + memoryInitializer;
   }));
  }
  var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer);
  if (memoryInitializerBytes) {
   applyMemoryInitializer(memoryInitializerBytes.buffer);
  } else if (Module["memoryInitializerRequest"]) {
   function useRequest() {
    var request = Module["memoryInitializerRequest"];
    var response = request.response;
    if (request.status !== 200 && request.status !== 0) {
     var data = tryParseAsDataURI(Module["memoryInitializerRequestURL"]);
     if (data) {
      response = data.buffer;
     } else {
      console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status + ", retrying " + memoryInitializer);
      doBrowserLoad();
      return;
     }
    }
    applyMemoryInitializer(response);
   }
   if (Module["memoryInitializerRequest"].response) {
    setTimeout(useRequest, 0);
   } else {
    Module["memoryInitializerRequest"].addEventListener("load", useRequest);
   }
  } else {
   doBrowserLoad();
  }
 }
}
function ExitStatus(status) {
 this.name = "ExitStatus";
 this.message = "Program terminated with exit(" + status + ")";
 this.status = status;
}
ExitStatus.prototype = new Error;
ExitStatus.prototype.constructor = ExitStatus;
var initialStackTop;
dependenciesFulfilled = function runCaller() {
 if (!Module["calledRun"]) run();
 if (!Module["calledRun"]) dependenciesFulfilled = runCaller;
};
function run(args) {
 args = args || Module["arguments"];
 if (runDependencies > 0) {
  return;
 }
 preRun();
 if (runDependencies > 0) return;
 if (Module["calledRun"]) return;
 function doRun() {
  if (Module["calledRun"]) return;
  Module["calledRun"] = true;
  if (ABORT) return;
  ensureInitRuntime();
  preMain();
  if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
  postRun();
 }
 if (Module["setStatus"]) {
  Module["setStatus"]("Running...");
  setTimeout((function() {
   setTimeout((function() {
    Module["setStatus"]("");
   }), 1);
   doRun();
  }), 1);
 } else {
  doRun();
 }
}
Module["run"] = run;
function abort(what) {
 if (Module["onAbort"]) {
  Module["onAbort"](what);
 }
 if (what !== undefined) {
  out(what);
  err(what);
  what = JSON.stringify(what);
 } else {
  what = "";
 }
 ABORT = true;
 EXITSTATUS = 1;
 throw "abort(" + what + "). Build with -s ASSERTIONS=1 for more info.";
}
Module["abort"] = abort;
if (Module["preInit"]) {
 if (typeof Module["preInit"] == "function") Module["preInit"] = [ Module["preInit"] ];
 while (Module["preInit"].length > 0) {
  Module["preInit"].pop()();
 }
}
Module["noExitRuntime"] = true;
run();





/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>
 Copyright 2009 The Closure Library Authors. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS-IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license long.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/long.js for details
 */
(function(global, factory) {

    /* AMD */ if (typeof define === 'function' && define["amd"])
        define([], factory);
    /* CommonJS */ else if (typeof require === 'function' && typeof module === "object" && module && module["exports"])
        module["exports"] = factory();
    /* Global */ else
        (global["dcodeIO"] = global["dcodeIO"] || {})["Long"] = factory();

})(this, function() {
    "use strict";

    /**
     * Constructs a 64 bit two's-complement integer, given its low and high 32 bit values as *signed* integers.
     *  See the from* functions below for more convenient ways of constructing Longs.
     * @exports Long
     * @class A Long class for representing a 64 bit two's-complement integer value.
     * @param {number} low The low (signed) 32 bits of the long
     * @param {number} high The high (signed) 32 bits of the long
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @constructor
     */
    function Long(low, high, unsigned) {

        /**
         * The low 32 bits as a signed value.
         * @type {number}
         */
        this.low = low | 0;

        /**
         * The high 32 bits as a signed value.
         * @type {number}
         */
        this.high = high | 0;

        /**
         * Whether unsigned or not.
         * @type {boolean}
         */
        this.unsigned = !!unsigned;
    }

    // The internal representation of a long is the two given signed, 32-bit values.
    // We use 32-bit pieces because these are the size of integers on which
    // Javascript performs bit-operations.  For operations like addition and
    // multiplication, we split each number into 16 bit pieces, which can easily be
    // multiplied within Javascript's floating-point representation without overflow
    // or change in sign.
    //
    // In the algorithms below, we frequently reduce the negative case to the
    // positive case by negating the input(s) and then post-processing the result.
    // Note that we must ALWAYS check specially whether those values are MIN_VALUE
    // (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
    // a positive number, it overflows back into a negative).  Not handling this
    // case would often result in infinite recursion.
    //
    // Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the from*
    // methods on which they depend.

    /**
     * An indicator used to reliably determine if an object is a Long or not.
     * @type {boolean}
     * @const
     * @private
     */
    Long.prototype.__isLong__;

    Object.defineProperty(Long.prototype, "__isLong__", {
        value: true,
        enumerable: false,
        configurable: false
    });

    /**
     * @function
     * @param {*} obj Object
     * @returns {boolean}
     * @inner
     */
    function isLong(obj) {
        return (obj && obj["__isLong__"]) === true;
    }

    /**
     * Tests if the specified object is a Long.
     * @function
     * @param {*} obj Object
     * @returns {boolean}
     */
    Long.isLong = isLong;

    /**
     * A cache of the Long representations of small integer values.
     * @type {!Object}
     * @inner
     */
    var INT_CACHE = {};

    /**
     * A cache of the Long representations of small unsigned integer values.
     * @type {!Object}
     * @inner
     */
    var UINT_CACHE = {};

    /**
     * @param {number} value
     * @param {boolean=} unsigned
     * @returns {!Long}
     * @inner
     */
    function fromInt(value, unsigned) {
        var obj, cachedObj, cache;
        if (unsigned) {
            value >>>= 0;
            if (cache = (0 <= value && value < 256)) {
                cachedObj = UINT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = fromBits(value, (value | 0) < 0 ? -1 : 0, true);
            if (cache)
                UINT_CACHE[value] = obj;
            return obj;
        } else {
            value |= 0;
            if (cache = (-128 <= value && value < 128)) {
                cachedObj = INT_CACHE[value];
                if (cachedObj)
                    return cachedObj;
            }
            obj = fromBits(value, value < 0 ? -1 : 0, false);
            if (cache)
                INT_CACHE[value] = obj;
            return obj;
        }
    }

    /**
     * Returns a Long representing the given 32 bit integer value.
     * @function
     * @param {number} value The 32 bit integer in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     */
    Long.fromInt = fromInt;

    /**
     * @param {number} value
     * @param {boolean=} unsigned
     * @returns {!Long}
     * @inner
     */
    function fromNumber(value, unsigned) {
        if (isNaN(value) || !isFinite(value))
            return unsigned ? UZERO : ZERO;
        if (unsigned) {
            if (value < 0)
                return UZERO;
            if (value >= TWO_PWR_64_DBL)
                return MAX_UNSIGNED_VALUE;
        } else {
            if (value <= -TWO_PWR_63_DBL)
                return MIN_VALUE;
            if (value + 1 >= TWO_PWR_63_DBL)
                return MAX_VALUE;
        }
        if (value < 0)
            return fromNumber(-value, unsigned).neg();
        return fromBits((value % TWO_PWR_32_DBL) | 0, (value / TWO_PWR_32_DBL) | 0, unsigned);
    }

    /**
     * Returns a Long representing the given value, provided that it is a finite number. Otherwise, zero is returned.
     * @function
     * @param {number} value The number in question
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     */
    Long.fromNumber = fromNumber;

    /**
     * @param {number} lowBits
     * @param {number} highBits
     * @param {boolean=} unsigned
     * @returns {!Long}
     * @inner
     */
    function fromBits(lowBits, highBits, unsigned) {
        return new Long(lowBits, highBits, unsigned);
    }

    /**
     * Returns a Long representing the 64 bit integer that comes by concatenating the given low and high bits. Each is
     *  assumed to use 32 bits.
     * @function
     * @param {number} lowBits The low 32 bits
     * @param {number} highBits The high 32 bits
     * @param {boolean=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @returns {!Long} The corresponding Long value
     */
    Long.fromBits = fromBits;

    /**
     * @function
     * @param {number} base
     * @param {number} exponent
     * @returns {number}
     * @inner
     */
    var pow_dbl = Math.pow; // Used 4 times (4*8 to 15+4)

    /**
     * @param {string} str
     * @param {(boolean|number)=} unsigned
     * @param {number=} radix
     * @returns {!Long}
     * @inner
     */
    function fromString(str, unsigned, radix) {
        if (str.length === 0)
            throw Error('empty string');
        if (str === "NaN" || str === "Infinity" || str === "+Infinity" || str === "-Infinity")
            return ZERO;
        if (typeof unsigned === 'number') {
            // For goog.math.long compatibility
            radix = unsigned,
            unsigned = false;
        } else {
            unsigned = !! unsigned;
        }
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw RangeError('radix');

        var p;
        if ((p = str.indexOf('-')) > 0)
            throw Error('interior hyphen');
        else if (p === 0) {
            return fromString(str.substring(1), unsigned, radix).neg();
        }

        // Do several (8) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = fromNumber(pow_dbl(radix, 8));

        var result = ZERO;
        for (var i = 0; i < str.length; i += 8) {
            var size = Math.min(8, str.length - i),
                value = parseInt(str.substring(i, i + size), radix);
            if (size < 8) {
                var power = fromNumber(pow_dbl(radix, size));
                result = result.mul(power).add(fromNumber(value));
            } else {
                result = result.mul(radixToPower);
                result = result.add(fromNumber(value));
            }
        }
        result.unsigned = unsigned;
        return result;
    }

    /**
     * Returns a Long representation of the given string, written using the specified radix.
     * @function
     * @param {string} str The textual representation of the Long
     * @param {(boolean|number)=} unsigned Whether unsigned or not, defaults to `false` for signed
     * @param {number=} radix The radix in which the text is written (2-36), defaults to 10
     * @returns {!Long} The corresponding Long value
     */
    Long.fromString = fromString;

    /**
     * @function
     * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val
     * @returns {!Long}
     * @inner
     */
    function fromValue(val) {
        if (val /* is compatible */ instanceof Long)
            return val;
        if (typeof val === 'number')
            return fromNumber(val);
        if (typeof val === 'string')
            return fromString(val);
        // Throws for non-objects, converts non-instanceof Long:
        return fromBits(val.low, val.high, val.unsigned);
    }

    /**
     * Converts the specified value to a Long.
     * @function
     * @param {!Long|number|string|!{low: number, high: number, unsigned: boolean}} val Value
     * @returns {!Long}
     */
    Long.fromValue = fromValue;

    // NOTE: the compiler should inline these constant values below and then remove these variables, so there should be
    // no runtime penalty for these.

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_16_DBL = 1 << 16;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_24_DBL = 1 << 24;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_32_DBL = TWO_PWR_16_DBL * TWO_PWR_16_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_64_DBL = TWO_PWR_32_DBL * TWO_PWR_32_DBL;

    /**
     * @type {number}
     * @const
     * @inner
     */
    var TWO_PWR_63_DBL = TWO_PWR_64_DBL / 2;

    /**
     * @type {!Long}
     * @const
     * @inner
     */
    var TWO_PWR_24 = fromInt(TWO_PWR_24_DBL);

    /**
     * @type {!Long}
     * @inner
     */
    var ZERO = fromInt(0);

    /**
     * Signed zero.
     * @type {!Long}
     */
    Long.ZERO = ZERO;

    /**
     * @type {!Long}
     * @inner
     */
    var UZERO = fromInt(0, true);

    /**
     * Unsigned zero.
     * @type {!Long}
     */
    Long.UZERO = UZERO;

    /**
     * @type {!Long}
     * @inner
     */
    var ONE = fromInt(1);

    /**
     * Signed one.
     * @type {!Long}
     */
    Long.ONE = ONE;

    /**
     * @type {!Long}
     * @inner
     */
    var UONE = fromInt(1, true);

    /**
     * Unsigned one.
     * @type {!Long}
     */
    Long.UONE = UONE;

    /**
     * @type {!Long}
     * @inner
     */
    var NEG_ONE = fromInt(-1);

    /**
     * Signed negative one.
     * @type {!Long}
     */
    Long.NEG_ONE = NEG_ONE;

    /**
     * @type {!Long}
     * @inner
     */
    var MAX_VALUE = fromBits(0xFFFFFFFF|0, 0x7FFFFFFF|0, false);

    /**
     * Maximum signed value.
     * @type {!Long}
     */
    Long.MAX_VALUE = MAX_VALUE;

    /**
     * @type {!Long}
     * @inner
     */
    var MAX_UNSIGNED_VALUE = fromBits(0xFFFFFFFF|0, 0xFFFFFFFF|0, true);

    /**
     * Maximum unsigned value.
     * @type {!Long}
     */
    Long.MAX_UNSIGNED_VALUE = MAX_UNSIGNED_VALUE;

    /**
     * @type {!Long}
     * @inner
     */
    var MIN_VALUE = fromBits(0, 0x80000000|0, false);

    /**
     * Minimum signed value.
     * @type {!Long}
     */
    Long.MIN_VALUE = MIN_VALUE;

    /**
     * @alias Long.prototype
     * @inner
     */
    var LongPrototype = Long.prototype;

    /**
     * Converts the Long to a 32 bit integer, assuming it is a 32 bit integer.
     * @returns {number}
     */
    LongPrototype.toInt = function toInt() {
        return this.unsigned ? this.low >>> 0 : this.low;
    };

    /**
     * Converts the Long to a the nearest floating-point representation of this value (double, 53 bit mantissa).
     * @returns {number}
     */
    LongPrototype.toNumber = function toNumber() {
        if (this.unsigned)
            return ((this.high >>> 0) * TWO_PWR_32_DBL) + (this.low >>> 0);
        return this.high * TWO_PWR_32_DBL + (this.low >>> 0);
    };

    /**
     * Converts the Long to a string written in the specified radix.
     * @param {number=} radix Radix (2-36), defaults to 10
     * @returns {string}
     * @override
     * @throws {RangeError} If `radix` is out of range
     */
    LongPrototype.toString = function toString(radix) {
        radix = radix || 10;
        if (radix < 2 || 36 < radix)
            throw RangeError('radix');
        if (this.isZero())
            return '0';
        if (this.isNegative()) { // Unsigned Longs are never negative
            if (this.eq(MIN_VALUE)) {
                // We need to change the Long value before it can be negated, so we remove
                // the bottom-most digit in this base and then recurse to do the rest.
                var radixLong = fromNumber(radix),
                    div = this.div(radixLong),
                    rem1 = div.mul(radixLong).sub(this);
                return div.toString(radix) + rem1.toInt().toString(radix);
            } else
                return '-' + this.neg().toString(radix);
        }

        // Do several (6) digits each time through the loop, so as to
        // minimize the calls to the very expensive emulated div.
        var radixToPower = fromNumber(pow_dbl(radix, 6), this.unsigned),
            rem = this;
        var result = '';
        while (true) {
            var remDiv = rem.div(radixToPower),
                intval = rem.sub(remDiv.mul(radixToPower)).toInt() >>> 0,
                digits = intval.toString(radix);
            rem = remDiv;
            if (rem.isZero())
                return digits + result;
            else {
                while (digits.length < 6)
                    digits = '0' + digits;
                result = '' + digits + result;
            }
        }
    };

    /**
     * Gets the high 32 bits as a signed integer.
     * @returns {number} Signed high bits
     */
    LongPrototype.getHighBits = function getHighBits() {
        return this.high;
    };

    /**
     * Gets the high 32 bits as an unsigned integer.
     * @returns {number} Unsigned high bits
     */
    LongPrototype.getHighBitsUnsigned = function getHighBitsUnsigned() {
        return this.high >>> 0;
    };

    /**
     * Gets the low 32 bits as a signed integer.
     * @returns {number} Signed low bits
     */
    LongPrototype.getLowBits = function getLowBits() {
        return this.low;
    };

    /**
     * Gets the low 32 bits as an unsigned integer.
     * @returns {number} Unsigned low bits
     */
    LongPrototype.getLowBitsUnsigned = function getLowBitsUnsigned() {
        return this.low >>> 0;
    };

    /**
     * Gets the number of bits needed to represent the absolute value of this Long.
     * @returns {number}
     */
    LongPrototype.getNumBitsAbs = function getNumBitsAbs() {
        if (this.isNegative()) // Unsigned Longs are never negative
            return this.eq(MIN_VALUE) ? 64 : this.neg().getNumBitsAbs();
        var val = this.high != 0 ? this.high : this.low;
        for (var bit = 31; bit > 0; bit--)
            if ((val & (1 << bit)) != 0)
                break;
        return this.high != 0 ? bit + 33 : bit + 1;
    };

    /**
     * Tests if this Long's value equals zero.
     * @returns {boolean}
     */
    LongPrototype.isZero = function isZero() {
        return this.high === 0 && this.low === 0;
    };

    /**
     * Tests if this Long's value is negative.
     * @returns {boolean}
     */
    LongPrototype.isNegative = function isNegative() {
        return !this.unsigned && this.high < 0;
    };

    /**
     * Tests if this Long's value is positive.
     * @returns {boolean}
     */
    LongPrototype.isPositive = function isPositive() {
        return this.unsigned || this.high >= 0;
    };

    /**
     * Tests if this Long's value is odd.
     * @returns {boolean}
     */
    LongPrototype.isOdd = function isOdd() {
        return (this.low & 1) === 1;
    };

    /**
     * Tests if this Long's value is even.
     * @returns {boolean}
     */
    LongPrototype.isEven = function isEven() {
        return (this.low & 1) === 0;
    };

    /**
     * Tests if this Long's value equals the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.equals = function equals(other) {
        if (!isLong(other))
            other = fromValue(other);
        if (this.unsigned !== other.unsigned && (this.high >>> 31) === 1 && (other.high >>> 31) === 1)
            return false;
        return this.high === other.high && this.low === other.low;
    };

    /**
     * Tests if this Long's value equals the specified's. This is an alias of {@link Long#equals}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.eq = LongPrototype.equals;

    /**
     * Tests if this Long's value differs from the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.notEquals = function notEquals(other) {
        return !this.eq(/* validates */ other);
    };

    /**
     * Tests if this Long's value differs from the specified's. This is an alias of {@link Long#notEquals}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.neq = LongPrototype.notEquals;

    /**
     * Tests if this Long's value is less than the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.lessThan = function lessThan(other) {
        return this.comp(/* validates */ other) < 0;
    };

    /**
     * Tests if this Long's value is less than the specified's. This is an alias of {@link Long#lessThan}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.lt = LongPrototype.lessThan;

    /**
     * Tests if this Long's value is less than or equal the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.lessThanOrEqual = function lessThanOrEqual(other) {
        return this.comp(/* validates */ other) <= 0;
    };

    /**
     * Tests if this Long's value is less than or equal the specified's. This is an alias of {@link Long#lessThanOrEqual}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.lte = LongPrototype.lessThanOrEqual;

    /**
     * Tests if this Long's value is greater than the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.greaterThan = function greaterThan(other) {
        return this.comp(/* validates */ other) > 0;
    };

    /**
     * Tests if this Long's value is greater than the specified's. This is an alias of {@link Long#greaterThan}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.gt = LongPrototype.greaterThan;

    /**
     * Tests if this Long's value is greater than or equal the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.greaterThanOrEqual = function greaterThanOrEqual(other) {
        return this.comp(/* validates */ other) >= 0;
    };

    /**
     * Tests if this Long's value is greater than or equal the specified's. This is an alias of {@link Long#greaterThanOrEqual}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {boolean}
     */
    LongPrototype.gte = LongPrototype.greaterThanOrEqual;

    /**
     * Compares this Long's value with the specified's.
     * @param {!Long|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     */
    LongPrototype.compare = function compare(other) {
        if (!isLong(other))
            other = fromValue(other);
        if (this.eq(other))
            return 0;
        var thisNeg = this.isNegative(),
            otherNeg = other.isNegative();
        if (thisNeg && !otherNeg)
            return -1;
        if (!thisNeg && otherNeg)
            return 1;
        // At this point the sign bits are the same
        if (!this.unsigned)
            return this.sub(other).isNegative() ? -1 : 1;
        // Both are positive if at least one is unsigned
        return (other.high >>> 0) > (this.high >>> 0) || (other.high === this.high && (other.low >>> 0) > (this.low >>> 0)) ? -1 : 1;
    };

    /**
     * Compares this Long's value with the specified's. This is an alias of {@link Long#compare}.
     * @function
     * @param {!Long|number|string} other Other value
     * @returns {number} 0 if they are the same, 1 if the this is greater and -1
     *  if the given one is greater
     */
    LongPrototype.comp = LongPrototype.compare;

    /**
     * Negates this Long's value.
     * @returns {!Long} Negated Long
     */
    LongPrototype.negate = function negate() {
        if (!this.unsigned && this.eq(MIN_VALUE))
            return MIN_VALUE;
        return this.not().add(ONE);
    };

    /**
     * Negates this Long's value. This is an alias of {@link Long#negate}.
     * @function
     * @returns {!Long} Negated Long
     */
    LongPrototype.neg = LongPrototype.negate;

    /**
     * Returns the sum of this and the specified Long.
     * @param {!Long|number|string} addend Addend
     * @returns {!Long} Sum
     */
    LongPrototype.add = function add(addend) {
        if (!isLong(addend))
            addend = fromValue(addend);

        // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = addend.high >>> 16;
        var b32 = addend.high & 0xFFFF;
        var b16 = addend.low >>> 16;
        var b00 = addend.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 + b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 + b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 + b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 + b48;
        c48 &= 0xFFFF;
        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns the difference of this and the specified Long.
     * @param {!Long|number|string} subtrahend Subtrahend
     * @returns {!Long} Difference
     */
    LongPrototype.subtract = function subtract(subtrahend) {
        if (!isLong(subtrahend))
            subtrahend = fromValue(subtrahend);
        return this.add(subtrahend.neg());
    };

    /**
     * Returns the difference of this and the specified Long. This is an alias of {@link Long#subtract}.
     * @function
     * @param {!Long|number|string} subtrahend Subtrahend
     * @returns {!Long} Difference
     */
    LongPrototype.sub = LongPrototype.subtract;

    /**
     * Returns the product of this and the specified Long.
     * @param {!Long|number|string} multiplier Multiplier
     * @returns {!Long} Product
     */
    LongPrototype.multiply = function multiply(multiplier) {
        if (this.isZero())
            return ZERO;
        if (!isLong(multiplier))
            multiplier = fromValue(multiplier);
        if (multiplier.isZero())
            return ZERO;
        if (this.eq(MIN_VALUE))
            return multiplier.isOdd() ? MIN_VALUE : ZERO;
        if (multiplier.eq(MIN_VALUE))
            return this.isOdd() ? MIN_VALUE : ZERO;

        if (this.isNegative()) {
            if (multiplier.isNegative())
                return this.neg().mul(multiplier.neg());
            else
                return this.neg().mul(multiplier).neg();
        } else if (multiplier.isNegative())
            return this.mul(multiplier.neg()).neg();

        // If both longs are small, use float multiplication
        if (this.lt(TWO_PWR_24) && multiplier.lt(TWO_PWR_24))
            return fromNumber(this.toNumber() * multiplier.toNumber(), this.unsigned);

        // Divide each long into 4 chunks of 16 bits, and then add up 4x4 products.
        // We can skip products that would overflow.

        var a48 = this.high >>> 16;
        var a32 = this.high & 0xFFFF;
        var a16 = this.low >>> 16;
        var a00 = this.low & 0xFFFF;

        var b48 = multiplier.high >>> 16;
        var b32 = multiplier.high & 0xFFFF;
        var b16 = multiplier.low >>> 16;
        var b00 = multiplier.low & 0xFFFF;

        var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
        c00 += a00 * b00;
        c16 += c00 >>> 16;
        c00 &= 0xFFFF;
        c16 += a16 * b00;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c16 += a00 * b16;
        c32 += c16 >>> 16;
        c16 &= 0xFFFF;
        c32 += a32 * b00;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a16 * b16;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c32 += a00 * b32;
        c48 += c32 >>> 16;
        c32 &= 0xFFFF;
        c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
        c48 &= 0xFFFF;
        return fromBits((c16 << 16) | c00, (c48 << 16) | c32, this.unsigned);
    };

    /**
     * Returns the product of this and the specified Long. This is an alias of {@link Long#multiply}.
     * @function
     * @param {!Long|number|string} multiplier Multiplier
     * @returns {!Long} Product
     */
    LongPrototype.mul = LongPrototype.multiply;

    /**
     * Returns this Long divided by the specified. The result is signed if this Long is signed or
     *  unsigned if this Long is unsigned.
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Quotient
     */
    LongPrototype.divide = function divide(divisor) {
        if (!isLong(divisor))
            divisor = fromValue(divisor);
        if (divisor.isZero())
            throw Error('division by zero');
        if (this.isZero())
            return this.unsigned ? UZERO : ZERO;
        var approx, rem, res;
        if (!this.unsigned) {
            // This section is only relevant for signed longs and is derived from the
            // closure library as a whole.
            if (this.eq(MIN_VALUE)) {
                if (divisor.eq(ONE) || divisor.eq(NEG_ONE))
                    return MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
                else if (divisor.eq(MIN_VALUE))
                    return ONE;
                else {
                    // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
                    var halfThis = this.shr(1);
                    approx = halfThis.div(divisor).shl(1);
                    if (approx.eq(ZERO)) {
                        return divisor.isNegative() ? ONE : NEG_ONE;
                    } else {
                        rem = this.sub(divisor.mul(approx));
                        res = approx.add(rem.div(divisor));
                        return res;
                    }
                }
            } else if (divisor.eq(MIN_VALUE))
                return this.unsigned ? UZERO : ZERO;
            if (this.isNegative()) {
                if (divisor.isNegative())
                    return this.neg().div(divisor.neg());
                return this.neg().div(divisor).neg();
            } else if (divisor.isNegative())
                return this.div(divisor.neg()).neg();
            res = ZERO;
        } else {
            // The algorithm below has not been made for unsigned longs. It's therefore
            // required to take special care of the MSB prior to running it.
            if (!divisor.unsigned)
                divisor = divisor.toUnsigned();
            if (divisor.gt(this))
                return UZERO;
            if (divisor.gt(this.shru(1))) // 15 >>> 1 = 7 ; with divisor = 8 ; true
                return UONE;
            res = UZERO;
        }

        // Repeat the following until the remainder is less than other:  find a
        // floating-point that approximates remainder / other *from below*, add this
        // into the result, and subtract it from the remainder.  It is critical that
        // the approximate value is less than or equal to the real value so that the
        // remainder never becomes negative.
        rem = this;
        while (rem.gte(divisor)) {
            // Approximate the result of division. This may be a little greater or
            // smaller than the actual value.
            approx = Math.max(1, Math.floor(rem.toNumber() / divisor.toNumber()));

            // We will tweak the approximate result by changing it in the 48-th digit or
            // the smallest non-fractional digit, whichever is larger.
            var log2 = Math.ceil(Math.log(approx) / Math.LN2),
                delta = (log2 <= 48) ? 1 : pow_dbl(2, log2 - 48),

            // Decrease the approximation until it is smaller than the remainder.  Note
            // that if it is too large, the product overflows and is negative.
                approxRes = fromNumber(approx),
                approxRem = approxRes.mul(divisor);
            while (approxRem.isNegative() || approxRem.gt(rem)) {
                approx -= delta;
                approxRes = fromNumber(approx, this.unsigned);
                approxRem = approxRes.mul(divisor);
            }

            // We know the answer can't be zero... and actually, zero would cause
            // infinite recursion since we would make no progress.
            if (approxRes.isZero())
                approxRes = ONE;

            res = res.add(approxRes);
            rem = rem.sub(approxRem);
        }
        return res;
    };

    /**
     * Returns this Long divided by the specified. This is an alias of {@link Long#divide}.
     * @function
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Quotient
     */
    LongPrototype.div = LongPrototype.divide;

    /**
     * Returns this Long modulo the specified.
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Remainder
     */
    LongPrototype.modulo = function modulo(divisor) {
        if (!isLong(divisor))
            divisor = fromValue(divisor);
        return this.sub(this.div(divisor).mul(divisor));
    };

    /**
     * Returns this Long modulo the specified. This is an alias of {@link Long#modulo}.
     * @function
     * @param {!Long|number|string} divisor Divisor
     * @returns {!Long} Remainder
     */
    LongPrototype.mod = LongPrototype.modulo;

    /**
     * Returns the bitwise NOT of this Long.
     * @returns {!Long}
     */
    LongPrototype.not = function not() {
        return fromBits(~this.low, ~this.high, this.unsigned);
    };

    /**
     * Returns the bitwise AND of this Long and the specified.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     */
    LongPrototype.and = function and(other) {
        if (!isLong(other))
            other = fromValue(other);
        return fromBits(this.low & other.low, this.high & other.high, this.unsigned);
    };

    /**
     * Returns the bitwise OR of this Long and the specified.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     */
    LongPrototype.or = function or(other) {
        if (!isLong(other))
            other = fromValue(other);
        return fromBits(this.low | other.low, this.high | other.high, this.unsigned);
    };

    /**
     * Returns the bitwise XOR of this Long and the given one.
     * @param {!Long|number|string} other Other Long
     * @returns {!Long}
     */
    LongPrototype.xor = function xor(other) {
        if (!isLong(other))
            other = fromValue(other);
        return fromBits(this.low ^ other.low, this.high ^ other.high, this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the left by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shiftLeft = function shiftLeft(numBits) {
        if (isLong(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return fromBits(this.low << numBits, (this.high << numBits) | (this.low >>> (32 - numBits)), this.unsigned);
        else
            return fromBits(0, this.low << (numBits - 32), this.unsigned);
    };

    /**
     * Returns this Long with bits shifted to the left by the given amount. This is an alias of {@link Long#shiftLeft}.
     * @function
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shl = LongPrototype.shiftLeft;

    /**
     * Returns this Long with bits arithmetically shifted to the right by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shiftRight = function shiftRight(numBits) {
        if (isLong(numBits))
            numBits = numBits.toInt();
        if ((numBits &= 63) === 0)
            return this;
        else if (numBits < 32)
            return fromBits((this.low >>> numBits) | (this.high << (32 - numBits)), this.high >> numBits, this.unsigned);
        else
            return fromBits(this.high >> (numBits - 32), this.high >= 0 ? 0 : -1, this.unsigned);
    };

    /**
     * Returns this Long with bits arithmetically shifted to the right by the given amount. This is an alias of {@link Long#shiftRight}.
     * @function
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shr = LongPrototype.shiftRight;

    /**
     * Returns this Long with bits logically shifted to the right by the given amount.
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shiftRightUnsigned = function shiftRightUnsigned(numBits) {
        if (isLong(numBits))
            numBits = numBits.toInt();
        numBits &= 63;
        if (numBits === 0)
            return this;
        else {
            var high = this.high;
            if (numBits < 32) {
                var low = this.low;
                return fromBits((low >>> numBits) | (high << (32 - numBits)), high >>> numBits, this.unsigned);
            } else if (numBits === 32)
                return fromBits(high, 0, this.unsigned);
            else
                return fromBits(high >>> (numBits - 32), 0, this.unsigned);
        }
    };

    /**
     * Returns this Long with bits logically shifted to the right by the given amount. This is an alias of {@link Long#shiftRightUnsigned}.
     * @function
     * @param {number|!Long} numBits Number of bits
     * @returns {!Long} Shifted Long
     */
    LongPrototype.shru = LongPrototype.shiftRightUnsigned;

    /**
     * Converts this Long to signed.
     * @returns {!Long} Signed long
     */
    LongPrototype.toSigned = function toSigned() {
        if (!this.unsigned)
            return this;
        return fromBits(this.low, this.high, false);
    };

    /**
     * Converts this Long to unsigned.
     * @returns {!Long} Unsigned long
     */
    LongPrototype.toUnsigned = function toUnsigned() {
        if (this.unsigned)
            return this;
        return fromBits(this.low, this.high, true);
    };

    /**
     * Converts this Long to its byte representation.
     * @param {boolean=} le Whether little or big endian, defaults to big endian
     * @returns {!Array.<number>} Byte representation
     */
    LongPrototype.toBytes = function(le) {
        return le ? this.toBytesLE() : this.toBytesBE();
    }

    /**
     * Converts this Long to its little endian byte representation.
     * @returns {!Array.<number>} Little endian byte representation
     */
    LongPrototype.toBytesLE = function() {
        var hi = this.high,
            lo = this.low;
        return [
             lo         & 0xff,
            (lo >>>  8) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>> 24) & 0xff,
             hi         & 0xff,
            (hi >>>  8) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>> 24) & 0xff
        ];
    }

    /**
     * Converts this Long to its big endian byte representation.
     * @returns {!Array.<number>} Big endian byte representation
     */
    LongPrototype.toBytesBE = function() {
        var hi = this.high,
            lo = this.low;
        return [
            (hi >>> 24) & 0xff,
            (hi >>> 16) & 0xff,
            (hi >>>  8) & 0xff,
             hi         & 0xff,
            (lo >>> 24) & 0xff,
            (lo >>> 16) & 0xff,
            (lo >>>  8) & 0xff,
             lo         & 0xff
        ];
    }

    return Long;
});

/*
 Copyright 2013-2014 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license ByteBuffer.js (c) 2013-2014 Daniel Wirtz <dcode@dcode.io>
 * This version of ByteBuffer.js uses an ArrayBuffer as its backing buffer which is accessed through a DataView and is
 * compatible with modern browsers.
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/ByteBuffer.js for details
 */ //
(function(global) {
    "use strict";

    /**
     * @param {function(new: Long, number, number, boolean=)=} Long
     * @returns {function(new: ByteBuffer, number=, boolean=, boolean=)}}
     * @inner
     */
    function loadByteBuffer(Long) {

        /**
         * Constructs a new ByteBuffer.
         * @class The swiss army knife for binary data in JavaScript.
         * @exports ByteBuffer
         * @constructor
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @expose
         */
        var ByteBuffer = function(capacity, littleEndian, noAssert) {
            if (typeof capacity     === 'undefined') capacity     = ByteBuffer.DEFAULT_CAPACITY;
            if (typeof littleEndian === 'undefined') littleEndian = ByteBuffer.DEFAULT_ENDIAN;
            if (typeof noAssert     === 'undefined') noAssert     = ByteBuffer.DEFAULT_NOASSERT;
            if (!noAssert) {
                capacity = capacity | 0;
                if (capacity < 0)
                    throw RangeError("Illegal capacity");
                littleEndian = !!littleEndian;
                noAssert = !!noAssert;
            }

            /**
             * Backing buffer.
             * @type {!ArrayBuffer}
             * @expose
             */
            this.buffer = capacity === 0 ? EMPTY_BUFFER : new ArrayBuffer(capacity);

            /**
             * Data view to manipulate the backing buffer. Becomes `null` if the backing buffer has a capacity of `0`.
             * @type {?DataView}
             * @expose
             */
            this.view = capacity === 0 ? null : new DataView(this.buffer);

            /**
             * Absolute read/write offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.offset = 0;

            /**
             * Marked offset.
             * @type {number}
             * @expose
             * @see ByteBuffer#mark
             * @see ByteBuffer#reset
             */
            this.markedOffset = -1;

            /**
             * Absolute limit of the contained data. Set to the backing buffer's capacity upon allocation.
             * @type {number}
             * @expose
             * @see ByteBuffer#flip
             * @see ByteBuffer#clear
             */
            this.limit = capacity;

            /**
             * Whether to use little endian byte order, defaults to `false` for big endian.
             * @type {boolean}
             * @expose
             */
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : false;

            /**
             * Whether to skip assertions of offsets and values, defaults to `false`.
             * @type {boolean}
             * @expose
             */
            this.noAssert = !!noAssert;
        };

        /**
         * ByteBuffer version.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.VERSION = "3.5.5";

        /**
         * Little endian constant that can be used instead of its boolean value. Evaluates to `true`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.LITTLE_ENDIAN = true;

        /**
         * Big endian constant that can be used instead of its boolean value. Evaluates to `false`.
         * @type {boolean}
         * @const
         * @expose
         */
        ByteBuffer.BIG_ENDIAN = false;

        /**
         * Default initial capacity of `16`.
         * @type {number}
         * @expose
         */
        ByteBuffer.DEFAULT_CAPACITY = 16;

        /**
         * Default endianess of `false` for big endian.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_ENDIAN = ByteBuffer.BIG_ENDIAN;

        /**
         * Default no assertions flag of `false`.
         * @type {boolean}
         * @expose
         */
        ByteBuffer.DEFAULT_NOASSERT = false;

        /**
         * A `Long` class for representing a 64-bit two's-complement integer value. May be `null` if Long.js has not been loaded
         *  and int64 support is not available.
         * @type {?Long}
         * @const
         * @see https://github.com/dcodeIO/Long.js
         * @expose
         */
        ByteBuffer.Long = Long || null;

        /**
         * @alias ByteBuffer.prototype
         * @inner
         */
        var ByteBufferPrototype = ByteBuffer.prototype;

        // helpers

        /**
         * @type {!ArrayBuffer}
         * @inner
         */
        var EMPTY_BUFFER = new ArrayBuffer(0);

        /**
         * String.fromCharCode reference for compile-time renaming.
         * @type {function(...number):string}
         * @inner
         */
        var stringFromCharCode = String.fromCharCode;

        /**
         * Creates a source function for a string.
         * @param {string} s String to read from
         * @returns {function():number|null} Source function returning the next char code respectively `null` if there are
         *  no more characters left.
         * @throws {TypeError} If the argument is invalid
         * @inner
         */
        function stringSource(s) {
            var i=0; return function() {
                return i < s.length ? s.charCodeAt(i++) : null;
            };
        }

        /**
         * Creates a destination function for a string.
         * @returns {function(number=):undefined|string} Destination function successively called with the next char code.
         *  Returns the final string when called without arguments.
         * @inner
         */
        function stringDestination() {
            var cs = [], ps = []; return function() {
                if (arguments.length === 0)
                    return ps.join('')+stringFromCharCode.apply(String, cs);
                if (cs.length + arguments.length > 1024)
                    ps.push(stringFromCharCode.apply(String, cs)),
                        cs.length = 0;
                Array.prototype.push.apply(cs, arguments);
            };
        }

        /**
         * Allocates a new ByteBuffer backed by a buffer of the specified capacity.
         * @param {number=} capacity Initial capacity. Defaults to {@link ByteBuffer.DEFAULT_CAPACITY}.
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer}
         * @expose
         */
        ByteBuffer.allocate = function(capacity, littleEndian, noAssert) {
            return new ByteBuffer(capacity, littleEndian, noAssert);
        };

        /**
         * Concatenates multiple ByteBuffers into one.
         * @param {!Array.<!ByteBuffer|!ArrayBuffer|!Uint8Array|string>} buffers Buffers to concatenate
         * @param {(string|boolean)=} encoding String encoding if `buffers` contains a string ("base64", "hex", "binary",
         *  defaults to "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order for the resulting ByteBuffer. Defaults
         *  to {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values for the resulting ByteBuffer. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} Concatenated ByteBuffer
         * @expose
         */
        ByteBuffer.concat = function(buffers, encoding, littleEndian, noAssert) {
            if (typeof encoding === 'boolean' || typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            var capacity = 0;
            for (var i=0, k=buffers.length, length; i<k; ++i) {
                if (!ByteBuffer.isByteBuffer(buffers[i]))
                    buffers[i] = ByteBuffer.wrap(buffers[i], encoding);
                length = buffers[i].limit - buffers[i].offset;
                if (length > 0) capacity += length;
            }
            if (capacity === 0)
                return new ByteBuffer(0, littleEndian, noAssert);
            var bb = new ByteBuffer(capacity, littleEndian, noAssert),
                bi;
            var view = new Uint8Array(bb.buffer);
            i=0; while (i<k) {
                bi = buffers[i++];
                length = bi.limit - bi.offset;
                if (length <= 0) continue;
                view.set(new Uint8Array(bi.buffer).subarray(bi.offset, bi.limit), bb.offset);
                bb.offset += length;
            }
            bb.limit = bb.offset;
            bb.offset = 0;
            return bb;
        };

        /**
         * Tests if the specified type is a ByteBuffer.
         * @param {*} bb ByteBuffer to test
         * @returns {boolean} `true` if it is a ByteBuffer, otherwise `false`
         * @expose
         */
        ByteBuffer.isByteBuffer = function(bb) {
            return (bb && bb instanceof ByteBuffer) === true;
        };
        /**
         * Gets the backing buffer type.
         * @returns {Function} `Buffer` for NB builds, `ArrayBuffer` for AB builds (classes)
         * @expose
         */
        ByteBuffer.type = function() {
            return ArrayBuffer;
        };

        /**
         * Wraps a buffer or a string. Sets the allocated ByteBuffer's {@link ByteBuffer#offset} to `0` and its
         *  {@link ByteBuffer#limit} to the length of the wrapped data.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string|!Array.<number>} buffer Anything that can be wrapped
         * @param {(string|boolean)=} encoding String encoding if `buffer` is a string ("base64", "hex", "binary", defaults to
         *  "utf8")
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} A ByteBuffer wrapping `buffer`
         * @expose
         */
        ByteBuffer.wrap = function(buffer, encoding, littleEndian, noAssert) {
            if (typeof encoding !== 'string') {
                noAssert = littleEndian;
                littleEndian = encoding;
                encoding = undefined;
            }
            if (typeof buffer === 'string') {
                if (typeof encoding === 'undefined')
                    encoding = "utf8";
                switch (encoding) {
                    case "base64":
                        return ByteBuffer.fromBase64(buffer, littleEndian);
                    case "hex":
                        return ByteBuffer.fromHex(buffer, littleEndian);
                    case "binary":
                        return ByteBuffer.fromBinary(buffer, littleEndian);
                    case "utf8":
                        return ByteBuffer.fromUTF8(buffer, littleEndian);
                    case "debug":
                        return ByteBuffer.fromDebug(buffer, littleEndian);
                    default:
                        throw Error("Unsupported encoding: "+encoding);
                }
            }
            if (buffer === null || typeof buffer !== 'object')
                throw TypeError("Illegal buffer");
            var bb;
            if (ByteBuffer.isByteBuffer(buffer)) {
                bb = ByteBufferPrototype.clone.call(buffer);
                bb.markedOffset = -1;
                return bb;
            }
            if (buffer instanceof Uint8Array) { // Extract ArrayBuffer from Uint8Array
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.length > 0) { // Avoid references to more than one EMPTY_BUFFER
                    bb.buffer = buffer.buffer;
                    bb.offset = buffer.byteOffset;
                    bb.limit = buffer.byteOffset + buffer.length;
                    bb.view = buffer.length > 0 ? new DataView(buffer.buffer) : null;
                }
            } else if (buffer instanceof ArrayBuffer) { // Reuse ArrayBuffer
                bb = new ByteBuffer(0, littleEndian, noAssert);
                if (buffer.byteLength > 0) {
                    bb.buffer = buffer;
                    bb.offset = 0;
                    bb.limit = buffer.byteLength;
                    bb.view = buffer.byteLength > 0 ? new DataView(buffer) : null;
                }
            } else if (Object.prototype.toString.call(buffer) === "[object Array]") { // Create from octets
                bb = new ByteBuffer(buffer.length, littleEndian, noAssert);
                bb.limit = buffer.length;
                for (i=0; i<buffer.length; ++i)
                    bb.view.setUint8(i, buffer[i]);
            } else
                throw TypeError("Illegal buffer"); // Otherwise fail
            return bb;
        };

        // types/ints/int8

        /**
         * Writes an 8bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeInt8 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 1;
            var capacity0 = this.buffer.byteLength;
            if (offset > capacity0)
                this.resize((capacity0 *= 2) > offset ? capacity0 : offset);
            offset -= 1;
            this.view.setInt8(offset, value);
            if (relative) this.offset += 1;
            return this;
        };

        /**
         * Writes an 8bit signed integer. This is an alias of {@link ByteBuffer#writeInt8}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeByte = ByteBufferPrototype.writeInt8;

        /**
         * Reads an 8bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt8 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt8(offset);
            if (relative) this.offset += 1;
            return value;
        };

        /**
         * Reads an 8bit signed integer. This is an alias of {@link ByteBuffer#readInt8}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readByte = ByteBufferPrototype.readInt8;

        /**
         * Writes an 8bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeUint8 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 1;
            var capacity1 = this.buffer.byteLength;
            if (offset > capacity1)
                this.resize((capacity1 *= 2) > offset ? capacity1 : offset);
            offset -= 1;
            this.view.setUint8(offset, value);
            if (relative) this.offset += 1;
            return this;
        };

        /**
         * Reads an 8bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `1` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readUint8 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint8(offset);
            if (relative) this.offset += 1;
            return value;
        };

        // types/ints/int16

        /**
         * Writes a 16bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeInt16 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 2;
            var capacity2 = this.buffer.byteLength;
            if (offset > capacity2)
                this.resize((capacity2 *= 2) > offset ? capacity2 : offset);
            offset -= 2;
            this.view.setInt16(offset, value, this.littleEndian);
            if (relative) this.offset += 2;
            return this;
        };

        /**
         * Writes a 16bit signed integer. This is an alias of {@link ByteBuffer#writeInt16}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeShort = ByteBufferPrototype.writeInt16;

        /**
         * Reads a 16bit signed integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readInt16 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt16(offset, this.littleEndian);
            if (relative) this.offset += 2;
            return value;
        };

        /**
         * Reads a 16bit signed integer. This is an alias of {@link ByteBuffer#readInt16}.
         * @function
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readShort = ByteBufferPrototype.readInt16;

        /**
         * Writes a 16bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @throws {TypeError} If `offset` or `value` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.writeUint16 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 2;
            var capacity3 = this.buffer.byteLength;
            if (offset > capacity3)
                this.resize((capacity3 *= 2) > offset ? capacity3 : offset);
            offset -= 2;
            this.view.setUint16(offset, value, this.littleEndian);
            if (relative) this.offset += 2;
            return this;
        };

        /**
         * Reads a 16bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `2` if omitted.
         * @returns {number} Value read
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @expose
         */
        ByteBufferPrototype.readUint16 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 2 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+2+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint16(offset, this.littleEndian);
            if (relative) this.offset += 2;
            return value;
        };

        // types/ints/int32

        /**
         * Writes a 32bit signed integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeInt32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity4 = this.buffer.byteLength;
            if (offset > capacity4)
                this.resize((capacity4 *= 2) > offset ? capacity4 : offset);
            offset -= 4;
            this.view.setInt32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Writes a 32bit signed integer. This is an alias of {@link ByteBuffer#writeInt32}.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeInt = ByteBufferPrototype.writeInt32;

        /**
         * Reads a 32bit signed integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getInt32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        /**
         * Reads a 32bit signed integer. This is an alias of {@link ByteBuffer#readInt32}.
         * @param {number=} offset Offset to read from. Will use and advance {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readInt = ByteBufferPrototype.readInt32;

        /**
         * Writes a 32bit unsigned integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @expose
         */
        ByteBufferPrototype.writeUint32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value >>>= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity5 = this.buffer.byteLength;
            if (offset > capacity5)
                this.resize((capacity5 *= 2) > offset ? capacity5 : offset);
            offset -= 4;
            this.view.setUint32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Reads a 32bit unsigned integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number} Value read
         * @expose
         */
        ByteBufferPrototype.readUint32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getUint32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        // types/ints/int64

        if (Long) {

            /**
             * Writes a 64bit signed integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeInt64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (typeof value === 'string')
                        value = Long.fromString(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                else if (typeof value === 'string')
                    value = Long.fromString(value);
                offset += 8;
                var capacity6 = this.buffer.byteLength;
                if (offset > capacity6)
                    this.resize((capacity6 *= 2) > offset ? capacity6 : offset);
                offset -= 8;
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                if (relative) this.offset += 8;
                return this;
            };

            /**
             * Writes a 64bit signed integer. This is an alias of {@link ByteBuffer#writeInt64}.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeLong = ByteBufferPrototype.writeInt64;

            /**
             * Reads a 64bit signed integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readInt64 = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), false)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), false);
                if (relative) this.offset += 8;
                return value;
            };

            /**
             * Reads a 64bit signed integer. This is an alias of {@link ByteBuffer#readInt64}.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readLong = ByteBufferPrototype.readInt64;

            /**
             * Writes a 64bit unsigned integer.
             * @param {number|!Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!ByteBuffer} this
             * @expose
             */
            ByteBufferPrototype.writeUint64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (typeof value === 'string')
                        value = Long.fromString(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                else if (typeof value === 'string')
                    value = Long.fromString(value);
                offset += 8;
                var capacity7 = this.buffer.byteLength;
                if (offset > capacity7)
                    this.resize((capacity7 *= 2) > offset ? capacity7 : offset);
                offset -= 8;
                if (this.littleEndian) {
                    this.view.setInt32(offset  , value.low , true);
                    this.view.setInt32(offset+4, value.high, true);
                } else {
                    this.view.setInt32(offset  , value.high, false);
                    this.view.setInt32(offset+4, value.low , false);
                }
                if (relative) this.offset += 8;
                return this;
            };

            /**
             * Reads a 64bit unsigned integer.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
             * @returns {!Long}
             * @expose
             */
            ByteBufferPrototype.readUint64 = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 8 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
                }
                var value = this.littleEndian
                    ? new Long(this.view.getInt32(offset  , true ), this.view.getInt32(offset+4, true ), true)
                    : new Long(this.view.getInt32(offset+4, false), this.view.getInt32(offset  , false), true);
                if (relative) this.offset += 8;
                return value;
            };

        } // Long


        // types/floats/float32

        /**
         * Writes a 32bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw TypeError("Illegal value: "+value+" (not a number)");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 4;
            var capacity8 = this.buffer.byteLength;
            if (offset > capacity8)
                this.resize((capacity8 *= 2) > offset ? capacity8 : offset);
            offset -= 4;
            this.view.setFloat32(offset, value, this.littleEndian);
            if (relative) this.offset += 4;
            return this;
        };

        /**
         * Writes a 32bit float. This is an alias of {@link ByteBuffer#writeFloat32}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat = ByteBufferPrototype.writeFloat32;

        /**
         * Reads a 32bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getFloat32(offset, this.littleEndian);
            if (relative) this.offset += 4;
            return value;
        };

        /**
         * Reads a 32bit float. This is an alias of {@link ByteBuffer#readFloat32}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `4` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat = ByteBufferPrototype.readFloat32;

        // types/floats/float64

        /**
         * Writes a 64bit float.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeFloat64 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number')
                    throw TypeError("Illegal value: "+value+" (not a number)");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            offset += 8;
            var capacity9 = this.buffer.byteLength;
            if (offset > capacity9)
                this.resize((capacity9 *= 2) > offset ? capacity9 : offset);
            offset -= 8;
            this.view.setFloat64(offset, value, this.littleEndian);
            if (relative) this.offset += 8;
            return this;
        };

        /**
         * Writes a 64bit float. This is an alias of {@link ByteBuffer#writeFloat64}.
         * @function
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.writeDouble = ByteBufferPrototype.writeFloat64;

        /**
         * Reads a 64bit float.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readFloat64 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 8 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+8+") <= "+this.buffer.byteLength);
            }
            var value = this.view.getFloat64(offset, this.littleEndian);
            if (relative) this.offset += 8;
            return value;
        };

        /**
         * Reads a 64bit float. This is an alias of {@link ByteBuffer#readFloat64}.
         * @function
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by `8` if omitted.
         * @returns {number}
         * @expose
         */
        ByteBufferPrototype.readDouble = ByteBufferPrototype.readFloat64;


        // types/varints/varint32

        /**
         * Maximum number of bytes required to store a 32bit base 128 variable-length integer.
         * @type {number}
         * @const
         * @expose
         */
        ByteBuffer.MAX_VARINT32_BYTES = 5;

        /**
         * Calculates the actual number of bytes required to store a 32bit base 128 variable-length integer.
         * @param {number} value Value to encode
         * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT32_BYTES}
         * @expose
         */
        ByteBuffer.calculateVarint32 = function(value) {
            // ref: src/google/protobuf/io/coded_stream.cc
            value = value >>> 0;
                 if (value < 1 << 7 ) return 1;
            else if (value < 1 << 14) return 2;
            else if (value < 1 << 21) return 3;
            else if (value < 1 << 28) return 4;
            else                      return 5;
        };

        /**
         * Zigzag encodes a signed 32bit integer so that it can be effectively used with varint encoding.
         * @param {number} n Signed 32bit integer
         * @returns {number} Unsigned zigzag encoded 32bit integer
         * @expose
         */
        ByteBuffer.zigZagEncode32 = function(n) {
            return (((n |= 0) << 1) ^ (n >> 31)) >>> 0; // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Decodes a zigzag encoded signed 32bit integer.
         * @param {number} n Unsigned zigzag encoded 32bit integer
         * @returns {number} Signed 32bit integer
         * @expose
         */
        ByteBuffer.zigZagDecode32 = function(n) {
            return ((n >>> 1) ^ -(n & 1)) | 0; // // ref: src/google/protobuf/wire_format_lite.h
        };

        /**
         * Writes a 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeVarint32 = function(value, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var size = ByteBuffer.calculateVarint32(value),
                b;
            offset += size;
            var capacity10 = this.buffer.byteLength;
            if (offset > capacity10)
                this.resize((capacity10 *= 2) > offset ? capacity10 : offset);
            offset -= size;
            // ref: http://code.google.com/searchframe#WTeibokF6gE/trunk/src/google/protobuf/io/coded_stream.cc
            this.view.setUint8(offset, b = value | 0x80);
            value >>>= 0;
            if (value >= 1 << 7) {
                b = (value >> 7) | 0x80;
                this.view.setUint8(offset+1, b);
                if (value >= 1 << 14) {
                    b = (value >> 14) | 0x80;
                    this.view.setUint8(offset+2, b);
                    if (value >= 1 << 21) {
                        b = (value >> 21) | 0x80;
                        this.view.setUint8(offset+3, b);
                        if (value >= 1 << 28) {
                            this.view.setUint8(offset+4, (value >> 28) & 0x0F);
                            size = 5;
                        } else {
                            this.view.setUint8(offset+3, b & 0x7F);
                            size = 4;
                        }
                    } else {
                        this.view.setUint8(offset+2, b & 0x7F);
                        size = 3;
                    }
                } else {
                    this.view.setUint8(offset+1, b & 0x7F);
                    size = 2;
                }
            } else {
                this.view.setUint8(offset, b & 0x7F);
                size = 1;
            }
            if (relative) {
                this.offset += size;
                return this;
            }
            return size;
        };

        /**
         * Writes a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number} value Value to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} this if `offset` is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeVarint32ZigZag = function(value, offset) {
            return this.writeVarint32(ByteBuffer.zigZagEncode32(value), offset);
        };

        /**
         * Reads a 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint. Has a property `truncated = true` if there is not enough data available
         *  to fully decode the varint.
         * @expose
         */
        ByteBufferPrototype.readVarint32 = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            // ref: src/google/protobuf/io/coded_stream.cc
            var size = 0,
                value = 0 >>> 0,
                temp,
                ioffset;
            do {
                ioffset = offset+size;
                if (!this.noAssert && ioffset > this.limit) {
                    var err = Error("Truncated");
                    err['truncated'] = true;
                    throw err;
                }
                temp = this.view.getUint8(ioffset);
                if (size < 5)
                    value |= ((temp&0x7F)<<(7*size)) >>> 0;
                ++size;
            } while ((temp & 0x80) === 0x80);
            value = value | 0; // Make sure to discard the higher order bits
            if (relative) {
                this.offset += size;
                return value;
            }
            return {
                "value": value,
                "length": size
            };
        };

        /**
         * Reads a zig-zag encoded 32bit base 128 variable-length integer.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {number|!{value: number, length: number}} The value read if offset is omitted, else the value read
         *  and the actual number of bytes read.
         * @throws {Error} If it's not a valid varint
         * @expose
         */
        ByteBufferPrototype.readVarint32ZigZag = function(offset) {
            var val = this.readVarint32(offset);
            if (typeof val === 'object')
                val["value"] = ByteBuffer.zigZagDecode32(val["value"]);
            else
                val = ByteBuffer.zigZagDecode32(val);
            return val;
        };

        // types/varints/varint64

        if (Long) {

            /**
             * Maximum number of bytes required to store a 64bit base 128 variable-length integer.
             * @type {number}
             * @const
             * @expose
             */
            ByteBuffer.MAX_VARINT64_BYTES = 10;

            /**
             * Calculates the actual number of bytes required to store a 64bit base 128 variable-length integer.
             * @param {number|!Long} value Value to encode
             * @returns {number} Number of bytes required. Capped to {@link ByteBuffer.MAX_VARINT64_BYTES}
             * @expose
             */
            ByteBuffer.calculateVarint64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value);
                else if (typeof value === 'string')
                    value = Long.fromString(value);
                // ref: src/google/protobuf/io/coded_stream.cc
                var part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                if (part2 == 0) {
                    if (part1 == 0) {
                        if (part0 < 1 << 14)
                            return part0 < 1 << 7 ? 1 : 2;
                        else
                            return part0 < 1 << 21 ? 3 : 4;
                    } else {
                        if (part1 < 1 << 14)
                            return part1 < 1 << 7 ? 5 : 6;
                        else
                            return part1 < 1 << 21 ? 7 : 8;
                    }
                } else
                    return part2 < 1 << 7 ? 9 : 10;
            };

            /**
             * Zigzag encodes a signed 64bit integer so that it can be effectively used with varint encoding.
             * @param {number|!Long} value Signed long
             * @returns {!Long} Unsigned zigzag encoded long
             * @expose
             */
            ByteBuffer.zigZagEncode64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (typeof value === 'string')
                    value = Long.fromString(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftLeft(1).xor(value.shiftRight(63)).toUnsigned();
            };

            /**
             * Decodes a zigzag encoded signed 64bit integer.
             * @param {!Long|number} value Unsigned zigzag encoded long or JavaScript number
             * @returns {!Long} Signed long
             * @expose
             */
            ByteBuffer.zigZagDecode64 = function(value) {
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (typeof value === 'string')
                    value = Long.fromString(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                // ref: src/google/protobuf/wire_format_lite.h
                return value.shiftRightUnsigned(1).xor(value.and(Long.ONE).toSigned().negate()).toSigned();
            };

            /**
             * Writes a 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeVarint64 = function(value, offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof value === 'number')
                        value = Long.fromNumber(value);
                    else if (typeof value === 'string')
                        value = Long.fromString(value);
                    else if (!(value && value instanceof Long))
                        throw TypeError("Illegal value: "+value+" (not an integer or Long)");
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 0 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
                }
                if (typeof value === 'number')
                    value = Long.fromNumber(value, false);
                else if (typeof value === 'string')
                    value = Long.fromString(value, false);
                else if (value.unsigned !== false) value = value.toSigned();
                var size = ByteBuffer.calculateVarint64(value),
                    part0 = value.toInt() >>> 0,
                    part1 = value.shiftRightUnsigned(28).toInt() >>> 0,
                    part2 = value.shiftRightUnsigned(56).toInt() >>> 0;
                offset += size;
                var capacity11 = this.buffer.byteLength;
                if (offset > capacity11)
                    this.resize((capacity11 *= 2) > offset ? capacity11 : offset);
                offset -= size;
                switch (size) {
                    case 10: this.view.setUint8(offset+9, (part2 >>>  7) & 0x01);
                    case 9 : this.view.setUint8(offset+8, size !== 9 ? (part2       ) | 0x80 : (part2       ) & 0x7F);
                    case 8 : this.view.setUint8(offset+7, size !== 8 ? (part1 >>> 21) | 0x80 : (part1 >>> 21) & 0x7F);
                    case 7 : this.view.setUint8(offset+6, size !== 7 ? (part1 >>> 14) | 0x80 : (part1 >>> 14) & 0x7F);
                    case 6 : this.view.setUint8(offset+5, size !== 6 ? (part1 >>>  7) | 0x80 : (part1 >>>  7) & 0x7F);
                    case 5 : this.view.setUint8(offset+4, size !== 5 ? (part1       ) | 0x80 : (part1       ) & 0x7F);
                    case 4 : this.view.setUint8(offset+3, size !== 4 ? (part0 >>> 21) | 0x80 : (part0 >>> 21) & 0x7F);
                    case 3 : this.view.setUint8(offset+2, size !== 3 ? (part0 >>> 14) | 0x80 : (part0 >>> 14) & 0x7F);
                    case 2 : this.view.setUint8(offset+1, size !== 2 ? (part0 >>>  7) | 0x80 : (part0 >>>  7) & 0x7F);
                    case 1 : this.view.setUint8(offset  , size !== 1 ? (part0       ) | 0x80 : (part0       ) & 0x7F);
                }
                if (relative) {
                    this.offset += size;
                    return this;
                } else {
                    return size;
                }
            };

            /**
             * Writes a zig-zag encoded 64bit base 128 variable-length integer.
             * @param {number|Long} value Value to write
             * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  written if omitted.
             * @returns {!ByteBuffer|number} `this` if offset is omitted, else the actual number of bytes written.
             * @expose
             */
            ByteBufferPrototype.writeVarint64ZigZag = function(value, offset) {
                return this.writeVarint64(ByteBuffer.zigZagEncode64(value), offset);
            };

            /**
             * Reads a 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBufferPrototype.readVarint64 = function(offset) {
                var relative = typeof offset === 'undefined';
                if (relative) offset = this.offset;
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + 1 > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
                }
                // ref: src/google/protobuf/io/coded_stream.cc
                var start = offset,
                    part0 = 0,
                    part1 = 0,
                    part2 = 0,
                    b  = 0;
                b = this.view.getUint8(offset++); part0  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part0 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) <<  7; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 14; if (b & 0x80) {
                b = this.view.getUint8(offset++); part1 |= (b & 0x7F) << 21; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2  = (b & 0x7F)      ; if (b & 0x80) {
                b = this.view.getUint8(offset++); part2 |= (b & 0x7F) <<  7; if (b & 0x80) {
                throw Error("Buffer overrun"); }}}}}}}}}}
                var value = Long.fromBits(part0 | (part1 << 28), (part1 >>> 4) | (part2) << 24, false);
                if (relative) {
                    this.offset = offset;
                    return value;
                } else {
                    return {
                        'value': value,
                        'length': offset-start
                    };
                }
            };

            /**
             * Reads a zig-zag encoded 64bit base 128 variable-length integer. Requires Long.js.
             * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
             *  read if omitted.
             * @returns {!Long|!{value: Long, length: number}} The value read if offset is omitted, else the value read and
             *  the actual number of bytes read.
             * @throws {Error} If it's not a valid varint
             * @expose
             */
            ByteBufferPrototype.readVarint64ZigZag = function(offset) {
                var val = this.readVarint64(offset);
                if (val && val['value'] instanceof Long)
                    val["value"] = ByteBuffer.zigZagDecode64(val["value"]);
                else
                    val = ByteBuffer.zigZagDecode64(val);
                return val;
            };

        } // Long


        // types/strings/cstring

        /**
         * Writes a NULL-terminated UTF8 encoded string. For this to work the specified string must not contain any NULL
         *  characters itself.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  contained in `str` + 1 if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written
         * @expose
         */
        ByteBufferPrototype.writeCString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            var i,
                k = str.length;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                for (i=0; i<k; ++i) {
                    if (str.charCodeAt(i) === 0)
                        throw RangeError("Illegal str: Contains NULL-characters");
                }
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            // UTF8 strings do not contain zero bytes in between except for the zero character, so:
            k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
            offset += k+1;
            var capacity12 = this.buffer.byteLength;
            if (offset > capacity12)
                this.resize((capacity12 *= 2) > offset ? capacity12 : offset);
            offset -= k+1;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            this.view.setUint8(offset++, 0);
            if (relative) {
                this.offset = offset;
                return this;
            }
            return k;
        };

        /**
         * Reads a NULL-terminated UTF8 encoded string. For this to work the string read must not contain any NULL characters
         *  itself.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readCString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                temp;
            // UTF8 strings do not contain zero bytes in between except for the zero character itself, so:
            var sd, b = -1;
            utfx.decodeUTF8toUTF16(function() {
                if (b === 0) return null;
                if (offset >= this.limit)
                    throw RangeError("Illegal range: Truncated data, "+offset+" < "+this.limit);
                return (b = this.view.getUint8(offset++)) === 0 ? null : b;
            }.bind(this), sd = stringDestination(), true);
            if (relative) {
                this.offset = offset;
                return sd();
            } else {
                return {
                    "string": sd(),
                    "length": offset - start
                };
            }
        };

        // types/strings/istring

        /**
         * Writes a length as uint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBufferPrototype.writeIString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                k;
            k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
            offset += 4+k;
            var capacity13 = this.buffer.byteLength;
            if (offset > capacity13)
                this.resize((capacity13 *= 2) > offset ? capacity13 : offset);
            offset -= 4+k;
            this.view.setUint32(offset, k, this.littleEndian);
            offset += 4;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (offset !== start + 4 + k)
                throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+4+k));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as uint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBufferPrototype.readIString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 4 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+4+") <= "+this.buffer.byteLength);
            }
            var temp = 0,
                start = offset,
                str;
            temp = this.view.getUint32(offset, this.littleEndian);
            offset += 4;
            var k = offset + temp,
                sd;
            utfx.decodeUTF8toUTF16(function() {
                return offset < k ? this.view.getUint8(offset++) : null;
            }.bind(this), sd = stringDestination(), this.noAssert);
            str = sd();
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };

        // types/strings/utf8string

        /**
         * Metrics representing number of UTF8 characters. Evaluates to `c`.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_CHARS = 'c';

        /**
         * Metrics representing number of bytes. Evaluates to `b`.
         * @type {string}
         * @const
         * @expose
         */
        ByteBuffer.METRICS_BYTES = 'b';

        /**
         * Writes an UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBufferPrototype.writeUTF8String = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var k;
            var start = offset;
            k = utfx.calculateUTF16asUTF8(stringSource(str))[1];
            offset += k;
            var capacity14 = this.buffer.byteLength;
            if (offset > capacity14)
                this.resize((capacity14 *= 2) > offset ? capacity14 : offset);
            offset -= k;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Writes an UTF8 encoded string. This is an alias of {@link ByteBuffer#writeUTF8String}.
         * @function
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} if omitted.
         * @returns {!ByteBuffer|number} this if offset is omitted, else the actual number of bytes written.
         * @expose
         */
        ByteBufferPrototype.writeString = ByteBufferPrototype.writeUTF8String;

        /**
         * Calculates the number of UTF8 characters of a string. JavaScript itself uses UTF-16, so that a string's
         *  `length` property does not reflect its actual UTF8 size if it contains code points larger than 0xFFFF.
         * @function
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 characters
         * @expose
         */
        ByteBuffer.calculateUTF8Chars = function(str) {
            return utfx.calculateUTF16asUTF8(stringSource(str))[0];
        };

        /**
         * Calculates the number of UTF8 bytes of a string.
         * @function
         * @param {string} str String to calculate
         * @returns {number} Number of UTF8 bytes
         * @expose
         */
        ByteBuffer.calculateUTF8Bytes = function(str) {
            return utfx.calculateUTF16asUTF8(stringSource(str))[1];
        };

        /**
         * Reads an UTF8 encoded string.
         * @param {number} length Number of characters or bytes to read.
         * @param {string=} metrics Metrics specifying what `length` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readUTF8String = function(length, metrics, offset) {
            if (typeof metrics === 'number') {
                offset = metrics;
                metrics = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (typeof metrics === 'undefined') metrics = ByteBuffer.METRICS_CHARS;
            if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw TypeError("Illegal length: "+length+" (not an integer)");
                length |= 0;
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var i = 0,
                start = offset,
                sd;
            if (metrics === ByteBuffer.METRICS_CHARS) { // The same for node and the browser
                sd = stringDestination();
                utfx.decodeUTF8(function() {
                    return i < length && offset < this.limit ? this.view.getUint8(offset++) : null;
                }.bind(this), function(cp) {
                    ++i; utfx.UTF8toUTF16(cp, sd);
                }.bind(this));
                if (i !== length)
                    throw RangeError("Illegal range: Truncated data, "+i+" == "+length);
                if (relative) {
                    this.offset = offset;
                    return sd();
                } else {
                    return {
                        "string": sd(),
                        "length": offset - start
                    };
                }
            } else if (metrics === ByteBuffer.METRICS_BYTES) {
                if (!this.noAssert) {
                    if (typeof offset !== 'number' || offset % 1 !== 0)
                        throw TypeError("Illegal offset: "+offset+" (not an integer)");
                    offset >>>= 0;
                    if (offset < 0 || offset + length > this.buffer.byteLength)
                        throw RangeError("Illegal offset: 0 <= "+offset+" (+"+length+") <= "+this.buffer.byteLength);
                }
                var k = offset + length;
                utfx.decodeUTF8toUTF16(function() {
                    return offset < k ? this.view.getUint8(offset++) : null;
                }.bind(this), sd = stringDestination(), this.noAssert);
                if (offset !== k)
                    throw RangeError("Illegal range: Truncated data, "+offset+" == "+k);
                if (relative) {
                    this.offset = offset;
                    return sd();
                } else {
                    return {
                        'string': sd(),
                        'length': offset - start
                    };
                }
            } else
                throw TypeError("Unsupported metrics: "+metrics);
        };

        /**
         * Reads an UTF8 encoded string. This is an alias of {@link ByteBuffer#readUTF8String}.
         * @function
         * @param {number} length Number of characters or bytes to read
         * @param {number=} metrics Metrics specifying what `n` is meant to count. Defaults to
         *  {@link ByteBuffer.METRICS_CHARS}.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         */
        ByteBufferPrototype.readString = ByteBufferPrototype.readUTF8String;

        // types/strings/vstring

        /**
         * Writes a length as varint32 prefixed UTF8 encoded string.
         * @param {string} str String to write
         * @param {number=} offset Offset to write to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted.
         * @returns {!ByteBuffer|number} `this` if `offset` is omitted, else the actual number of bytes written
         * @expose
         * @see ByteBuffer#writeVarint32
         */
        ByteBufferPrototype.writeVString = function(str, offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            var start = offset,
                k, l;
            k = utfx.calculateUTF16asUTF8(stringSource(str), this.noAssert)[1];
            l = ByteBuffer.calculateVarint32(k);
            offset += l+k;
            var capacity15 = this.buffer.byteLength;
            if (offset > capacity15)
                this.resize((capacity15 *= 2) > offset ? capacity15 : offset);
            offset -= l+k;
            offset += this.writeVarint32(k, offset);
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                this.view.setUint8(offset++, b);
            }.bind(this));
            if (offset !== start+k+l)
                throw RangeError("Illegal range: Truncated data, "+offset+" == "+(offset+k+l));
            if (relative) {
                this.offset = offset;
                return this;
            }
            return offset - start;
        };

        /**
         * Reads a length as varint32 prefixed UTF8 encoded string.
         * @param {number=} offset Offset to read from. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {string|!{string: string, length: number}} The string read if offset is omitted, else the string
         *  read and the actual number of bytes read.
         * @expose
         * @see ByteBuffer#readVarint32
         */
        ByteBufferPrototype.readVString = function(offset) {
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 1 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+1+") <= "+this.buffer.byteLength);
            }
            var temp = this.readVarint32(offset),
                start = offset,
                str;
            offset += temp['length'];
            temp = temp['value'];
            var k = offset + temp,
                sd = stringDestination();
            utfx.decodeUTF8toUTF16(function() {
                return offset < k ? this.view.getUint8(offset++) : null;
            }.bind(this), sd, this.noAssert);
            str = sd();
            if (relative) {
                this.offset = offset;
                return str;
            } else {
                return {
                    'string': str,
                    'length': offset - start
                };
            }
        };


        /**
         * Appends some data to this ByteBuffer. This will overwrite any contents behind the specified offset up to the appended
         *  data's length.
         * @param {!ByteBuffer|!ArrayBuffer|!Uint8Array|string} source Data to append. If `source` is a ByteBuffer, its offsets
         *  will be modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to append at. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example A relative `<01 02>03.append(<04 05>)` will result in `<01 02 04 05>, 04 05|`
         * @example An absolute `<01 02>03.append(04 05>, 1)` will result in `<01 04>05, 04 05|`
         */
        ByteBufferPrototype.append = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var length = source.limit - source.offset;
            if (length <= 0) return this; // Nothing to append
            offset += length;
            var capacity16 = this.buffer.byteLength;
            if (offset > capacity16)
                this.resize((capacity16 *= 2) > offset ? capacity16 : offset);
            offset -= length;
            new Uint8Array(this.buffer, offset).set(new Uint8Array(source.buffer).subarray(source.offset, source.limit));
            source.offset += length;
            if (relative) this.offset += length;
            return this;
        };

        /**
         * Appends this ByteBuffer's contents to another ByteBuffer. This will overwrite any contents at and after the
            specified offset up to the length of this ByteBuffer's data.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to append to. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  read if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#append
         */
        ByteBufferPrototype.appendTo = function(target, offset) {
            target.append(this, offset);
            return this;
        };

        /**
         * Enables or disables assertions of argument types and offsets. Assertions are enabled by default but you can opt to
         *  disable them if your code already makes sure that everything is valid.
         * @param {boolean} assert `true` to enable assertions, otherwise `false`
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.assert = function(assert) {
            this.noAssert = !assert;
            return this;
        };

        /**
         * Gets the capacity of this ByteBuffer's backing buffer.
         * @returns {number} Capacity of the backing buffer
         * @expose
         */
        ByteBufferPrototype.capacity = function() {
            return this.buffer.byteLength;
        };

        /**
         * Clears this ByteBuffer's offsets by setting {@link ByteBuffer#offset} to `0` and {@link ByteBuffer#limit} to the
         *  backing buffer's capacity. Discards {@link ByteBuffer#markedOffset}.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.clear = function() {
            this.offset = 0;
            this.limit = this.buffer.byteLength;
            this.markedOffset = -1;
            return this;
        };

        /**
         * Creates a cloned instance of this ByteBuffer, preset with this ByteBuffer's values for {@link ByteBuffer#offset},
         *  {@link ByteBuffer#markedOffset} and {@link ByteBuffer#limit}.
         * @param {boolean=} copy Whether to copy the backing buffer or to return another view on the same, defaults to `false`
         * @returns {!ByteBuffer} Cloned instance
         * @expose
         */
        ByteBufferPrototype.clone = function(copy) {
            var bb = new ByteBuffer(0, this.littleEndian, this.noAssert);
            if (copy) {
                var buffer = new ArrayBuffer(this.buffer.byteLength);
                new Uint8Array(buffer).set(this.buffer);
                bb.buffer = buffer;
                bb.view = new DataView(buffer);
            } else {
                bb.buffer = this.buffer;
                bb.view = this.view;
            }
            bb.offset = this.offset;
            bb.markedOffset = this.markedOffset;
            bb.limit = this.limit;
            return bb;
        };

        /**
         * Compacts this ByteBuffer to be backed by a {@link ByteBuffer#buffer} of its contents' length. Contents are the bytes
         *  between {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will set `offset = 0` and `limit = capacity` and
         *  adapt {@link ByteBuffer#markedOffset} to the same relative position if set.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.compact = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === 0 && end === this.buffer.byteLength)
                return this; // Already compacted
            var len = end - begin;
            if (len === 0) {
                this.buffer = EMPTY_BUFFER;
                this.view = null;
                if (this.markedOffset >= 0) this.markedOffset -= begin;
                this.offset = 0;
                this.limit = 0;
                return this;
            }
            var buffer = new ArrayBuffer(len);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(begin, end));
            this.buffer = buffer;
            this.view = new DataView(buffer);
            if (this.markedOffset >= 0) this.markedOffset -= begin;
            this.offset = 0;
            this.limit = len;
            return this;
        };

        /**
         * Creates a copy of this ByteBuffer's contents. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Copy
         * @expose
         */
        ByteBufferPrototype.copy = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return new ByteBuffer(0, this.littleEndian, this.noAssert);
            var capacity = end - begin,
                bb = new ByteBuffer(capacity, this.littleEndian, this.noAssert);
            bb.offset = 0;
            bb.limit = capacity;
            if (bb.markedOffset >= 0) bb.markedOffset -= begin;
            this.copyTo(bb, 0, begin, end);
            return bb;
        };

        /**
         * Copies this ByteBuffer's contents to another ByteBuffer. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} targetOffset Offset to copy to. Will use and increase the target's {@link ByteBuffer#offset}
         *  by the number of bytes copied if omitted.
         * @param {number=} sourceOffset Offset to start copying from. Will use and increase {@link ByteBuffer#offset} by the
         *  number of bytes copied if omitted.
         * @param {number=} sourceLimit Offset to end copying from, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.copyTo = function(target, targetOffset, sourceOffset, sourceLimit) {
            var relative,
                targetRelative;
            if (!this.noAssert) {
                if (!ByteBuffer.isByteBuffer(target))
                    throw TypeError("Illegal target: Not a ByteBuffer");
            }
            targetOffset = (targetRelative = typeof targetOffset === 'undefined') ? target.offset : targetOffset | 0;
            sourceOffset = (relative = typeof sourceOffset === 'undefined') ? this.offset : sourceOffset | 0;
            sourceLimit = typeof sourceLimit === 'undefined' ? this.limit : sourceLimit | 0;

            if (targetOffset < 0 || targetOffset > target.buffer.byteLength)
                throw RangeError("Illegal target range: 0 <= "+targetOffset+" <= "+target.buffer.byteLength);
            if (sourceOffset < 0 || sourceLimit > this.buffer.byteLength)
                throw RangeError("Illegal source range: 0 <= "+sourceOffset+" <= "+this.buffer.byteLength);

            var len = sourceLimit - sourceOffset;
            if (len === 0)
                return target; // Nothing to copy

            target.ensureCapacity(targetOffset + len);

            new Uint8Array(target.buffer).set(new Uint8Array(this.buffer).subarray(sourceOffset, sourceLimit), targetOffset);

            if (relative) this.offset += len;
            if (targetRelative) target.offset += len;

            return this;
        };

        /**
         * Makes sure that this ByteBuffer is backed by a {@link ByteBuffer#buffer} of at least the specified capacity. If the
         *  current capacity is exceeded, it will be doubled. If double the current capacity is less than the required capacity,
         *  the required capacity will be used instead.
         * @param {number} capacity Required capacity
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.ensureCapacity = function(capacity) {
            var current = this.buffer.byteLength;
            if (current < capacity)
                return this.resize((current *= 2) > capacity ? current : capacity);
            return this;
        };

        /**
         * Overwrites this ByteBuffer's contents with the specified value. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}.
         * @param {number|string} value Byte value to fill with. If given as a string, the first character is used.
         * @param {number=} begin Begin offset. Will use and increase {@link ByteBuffer#offset} by the number of bytes
         *  written if omitted. defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} this
         * @expose
         * @example `someByteBuffer.clear().fill(0)` fills the entire backing buffer with zeroes
         */
        ByteBufferPrototype.fill = function(value, begin, end) {
            var relative = typeof begin === 'undefined';
            if (relative) begin = this.offset;
            if (typeof value === 'string' && value.length > 0)
                value = value.charCodeAt(0);
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof value !== 'number' || value % 1 !== 0)
                    throw TypeError("Illegal value: "+value+" (not an integer)");
                value |= 0;
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin >= end)
                return this; // Nothing to fill
            while (begin < end) this.view.setUint8(begin++, value);
            if (relative) this.offset = begin;
            return this;
        };

        /**
         * Makes this ByteBuffer ready for a new sequence of write or relative read operations. Sets `limit = offset` and
         *  `offset = 0`. Make sure always to flip a ByteBuffer when all relative read or write operations are complete.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.flip = function() {
            this.limit = this.offset;
            this.offset = 0;
            return this;
        };
        /**
         * Marks an offset on this ByteBuffer to be used later.
         * @param {number=} offset Offset to mark. Defaults to {@link ByteBuffer#offset}.
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `offset` is not a valid number
         * @throws {RangeError} If `offset` is out of bounds
         * @see ByteBuffer#reset
         * @expose
         */
        ByteBufferPrototype.mark = function(offset) {
            offset = typeof offset === 'undefined' ? this.offset : offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            this.markedOffset = offset;
            return this;
        };
        /**
         * Sets the byte order.
         * @param {boolean} littleEndian `true` for little endian byte order, `false` for big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.order = function(littleEndian) {
            if (!this.noAssert) {
                if (typeof littleEndian !== 'boolean')
                    throw TypeError("Illegal littleEndian: Not a boolean");
            }
            this.littleEndian = !!littleEndian;
            return this;
        };

        /**
         * Switches (to) little endian byte order.
         * @param {boolean=} littleEndian Defaults to `true`, otherwise uses big endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.LE = function(littleEndian) {
            this.littleEndian = typeof littleEndian !== 'undefined' ? !!littleEndian : true;
            return this;
        };

        /**
         * Switches (to) big endian byte order.
         * @param {boolean=} bigEndian Defaults to `true`, otherwise uses little endian
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.BE = function(bigEndian) {
            this.littleEndian = typeof bigEndian !== 'undefined' ? !bigEndian : false;
            return this;
        };
        /**
         * Prepends some data to this ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer|string|!ArrayBuffer} source Data to prepend. If `source` is a ByteBuffer, its offset will be
         *  modified according to the performed read operation.
         * @param {(string|number)=} encoding Encoding if `data` is a string ("base64", "hex", "binary", defaults to "utf8")
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @example A relative `00<01 02 03>.prepend(<04 05>)` results in `<04 05 01 02 03>, 04 05|`
         * @example An absolute `00<01 02 03>.prepend(<04 05>, 2)` results in `04<05 02 03>, 04 05|`
         */
        ByteBufferPrototype.prepend = function(source, encoding, offset) {
            if (typeof encoding === 'number' || typeof encoding !== 'string') {
                offset = encoding;
                encoding = undefined;
            }
            var relative = typeof offset === 'undefined';
            if (relative) offset = this.offset;
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: "+offset+" (not an integer)");
                offset >>>= 0;
                if (offset < 0 || offset + 0 > this.buffer.byteLength)
                    throw RangeError("Illegal offset: 0 <= "+offset+" (+"+0+") <= "+this.buffer.byteLength);
            }
            if (!(source instanceof ByteBuffer))
                source = ByteBuffer.wrap(source, encoding);
            var len = source.limit - source.offset;
            if (len <= 0) return this; // Nothing to prepend
            var diff = len - offset;
            var arrayView;
            if (diff > 0) { // Not enough space before offset, so resize + move
                var buffer = new ArrayBuffer(this.buffer.byteLength + diff);
                arrayView = new Uint8Array(buffer);
                arrayView.set(new Uint8Array(this.buffer).subarray(offset, this.buffer.byteLength), len);
                this.buffer = buffer;
                this.view = new DataView(buffer);
                this.offset += diff;
                if (this.markedOffset >= 0) this.markedOffset += diff;
                this.limit += diff;
                offset += diff;
            } else {
                arrayView = new Uint8Array(this.buffer);
            }
            arrayView.set(new Uint8Array(source.buffer).subarray(source.offset, source.limit), offset - len);
            source.offset = source.limit;
            if (relative)
                this.offset -= len;
            return this;
        };

        /**
         * Prepends this ByteBuffer to another ByteBuffer. This will overwrite any contents before the specified offset up to the
         *  prepended data's length. If there is not enough space available before the specified `offset`, the backing buffer
         *  will be resized and its contents moved accordingly.
         * @param {!ByteBuffer} target Target ByteBuffer
         * @param {number=} offset Offset to prepend at. Will use and decrease {@link ByteBuffer#offset} by the number of bytes
         *  prepended if omitted.
         * @returns {!ByteBuffer} this
         * @expose
         * @see ByteBuffer#prepend
         */
        ByteBufferPrototype.prependTo = function(target, offset) {
            target.prepend(this, offset);
            return this;
        };
        /**
         * Prints debug information about this ByteBuffer's contents.
         * @param {function(string)=} out Output function to call, defaults to console.log
         * @expose
         */
        ByteBufferPrototype.printDebug = function(out) {
            if (typeof out !== 'function') out = console.log.bind(console);
            out(
                this.toString()+"\n"+
                "-------------------------------------------------------------------\n"+
                this.toDebug(/* columns */ true)
            );
        };

        /**
         * Gets the number of remaining readable bytes. Contents are the bytes between {@link ByteBuffer#offset} and
         *  {@link ByteBuffer#limit}, so this returns `limit - offset`.
         * @returns {number} Remaining readable bytes. May be negative if `offset > limit`.
         * @expose
         */
        ByteBufferPrototype.remaining = function() {
            return this.limit - this.offset;
        };
        /**
         * Resets this ByteBuffer's {@link ByteBuffer#offset}. If an offset has been marked through {@link ByteBuffer#mark}
         *  before, `offset` will be set to {@link ByteBuffer#markedOffset}, which will then be discarded. If no offset has been
         *  marked, sets `offset = 0`.
         * @returns {!ByteBuffer} this
         * @see ByteBuffer#mark
         * @expose
         */
        ByteBufferPrototype.reset = function() {
            if (this.markedOffset >= 0) {
                this.offset = this.markedOffset;
                this.markedOffset = -1;
            } else {
                this.offset = 0;
            }
            return this;
        };
        /**
         * Resizes this ByteBuffer to be backed by a buffer of at least the given capacity. Will do nothing if already that
         *  large or larger.
         * @param {number} capacity Capacity required
         * @returns {!ByteBuffer} this
         * @throws {TypeError} If `capacity` is not a number
         * @throws {RangeError} If `capacity < 0`
         * @expose
         */
        ByteBufferPrototype.resize = function(capacity) {
            if (!this.noAssert) {
                if (typeof capacity !== 'number' || capacity % 1 !== 0)
                    throw TypeError("Illegal capacity: "+capacity+" (not an integer)");
                capacity |= 0;
                if (capacity < 0)
                    throw RangeError("Illegal capacity: 0 <= "+capacity);
            }
            if (this.buffer.byteLength < capacity) {
                var buffer = new ArrayBuffer(capacity);
                new Uint8Array(buffer).set(new Uint8Array(this.buffer));
                this.buffer = buffer;
                this.view = new DataView(buffer);
            }
            return this;
        };
        /**
         * Reverses this ByteBuffer's contents.
         * @param {number=} begin Offset to start at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.reverse = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return this; // Nothing to reverse
            Array.prototype.reverse.call(new Uint8Array(this.buffer).subarray(begin, end));
            this.view = new DataView(this.buffer); // FIXME: Why exactly is this necessary?
            return this;
        };
        /**
         * Skips the next `length` bytes. This will just advance
         * @param {number} length Number of bytes to skip. May also be negative to move the offset back.
         * @returns {!ByteBuffer} this
         * @expose
         */
        ByteBufferPrototype.skip = function(length) {
            if (!this.noAssert) {
                if (typeof length !== 'number' || length % 1 !== 0)
                    throw TypeError("Illegal length: "+length+" (not an integer)");
                length |= 0;
            }
            var offset = this.offset + length;
            if (!this.noAssert) {
                if (offset < 0 || offset > this.buffer.byteLength)
                    throw RangeError("Illegal length: 0 <= "+this.offset+" + "+length+" <= "+this.buffer.byteLength);
            }
            this.offset = offset;
            return this;
        };

        /**
         * Slices this ByteBuffer by creating a cloned instance with `offset = begin` and `limit = end`.
         * @param {number=} begin Begin offset, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end End offset, defaults to {@link ByteBuffer#limit}.
         * @returns {!ByteBuffer} Clone of this ByteBuffer with slicing applied, backed by the same {@link ByteBuffer#buffer}
         * @expose
         */
        ByteBufferPrototype.slice = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var bb = this.clone();
            bb.offset = begin;
            bb.limit = end;
            return bb;
        };
        /**
         * Returns a copy of the backing buffer that contains this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched.
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory if
         *  possible. Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBufferPrototype.toBuffer = function(forceCopy) {
            var offset = this.offset,
                limit = this.limit;
            if (offset > limit) {
                var t = offset;
                offset = limit;
                limit = t;
            }
            if (!this.noAssert) {
                if (typeof offset !== 'number' || offset % 1 !== 0)
                    throw TypeError("Illegal offset: Not an integer");
                offset >>>= 0;
                if (typeof limit !== 'number' || limit % 1 !== 0)
                    throw TypeError("Illegal limit: Not an integer");
                limit >>>= 0;
                if (offset < 0 || offset > limit || limit > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+offset+" <= "+limit+" <= "+this.buffer.byteLength);
            }
            // NOTE: It's not possible to have another ArrayBuffer reference the same memory as the backing buffer. This is
            // possible with Uint8Array#subarray only, but we have to return an ArrayBuffer by contract. So:
            if (!forceCopy && offset === 0 && limit === this.buffer.byteLength) {
                return this.buffer;
            }
            if (offset === limit) {
                return EMPTY_BUFFER;
            }
            var buffer = new ArrayBuffer(limit - offset);
            new Uint8Array(buffer).set(new Uint8Array(this.buffer).subarray(offset, limit), 0);
            return buffer;
        };

        /**
         * Returns a raw buffer compacted to contain this ByteBuffer's contents. Contents are the bytes between
         *  {@link ByteBuffer#offset} and {@link ByteBuffer#limit}. Will transparently {@link ByteBuffer#flip} this
         *  ByteBuffer if `offset > limit` but the actual offsets remain untouched. This is an alias of
         *  {@link ByteBuffer#toBuffer}.
         * @function
         * @param {boolean=} forceCopy If `true` returns a copy, otherwise returns a view referencing the same memory.
         *  Defaults to `false`
         * @returns {!ArrayBuffer} Contents as an ArrayBuffer
         * @expose
         */
        ByteBufferPrototype.toArrayBuffer = ByteBufferPrototype.toBuffer;


        /**
         * Converts the ByteBuffer's contents to a string.
         * @param {string=} encoding Output encoding. Returns an informative string representation if omitted but also allows
         *  direct conversion to "utf8", "hex", "base64" and "binary" encoding. "debug" returns a hex representation with
         *  highlighted offsets.
         * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}
         * @returns {string} String representation
         * @throws {Error} If `encoding` is invalid
         * @expose
         */
        ByteBufferPrototype.toString = function(encoding, begin, end) {
            if (typeof encoding === 'undefined')
                return "ByteBufferAB(offset="+this.offset+",markedOffset="+this.markedOffset+",limit="+this.limit+",capacity="+this.capacity()+")";
            if (typeof encoding === 'number')
                encoding = "utf8",
                begin = encoding,
                end = begin;
            switch (encoding) {
                case "utf8":
                    return this.toUTF8(begin, end);
                case "base64":
                    return this.toBase64(begin, end);
                case "hex":
                    return this.toHex(begin, end);
                case "binary":
                    return this.toBinary(begin, end);
                case "debug":
                    return this.toDebug();
                case "columns":
                    return this.toColumns();
                default:
                    throw Error("Unsupported encoding: "+encoding);
            }
        };

        // lxiv-embeddable

        /**
         * lxiv-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
         * Released under the Apache License, Version 2.0
         * see: https://github.com/dcodeIO/lxiv for details
         */
        var lxiv = function() {
            "use strict";

            /**
             * lxiv namespace.
             * @type {!Object.<string,*>}
             * @exports lxiv
             */
            var lxiv = {};

            /**
             * Character codes for output.
             * @type {!Array.<number>}
             * @inner
             */
            var aout = [
                65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
                81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102,
                103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
                119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47
            ];

            /**
             * Character codes for input.
             * @type {!Array.<number>}
             * @inner
             */
            var ain = [];
            for (var i=0, k=aout.length; i<k; ++i)
                ain[aout[i]] = i;

            /**
             * Encodes bytes to base64 char codes.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if
             *  there are no more bytes left.
             * @param {!function(number)} dst Characters destination as a function successively called with each encoded char
             *  code.
             */
            lxiv.encode = function(src, dst) {
                var b, t;
                while ((b = src()) !== null) {
                    dst(aout[(b>>2)&0x3f]);
                    t = (b&0x3)<<4;
                    if ((b = src()) !== null) {
                        t |= (b>>4)&0xf;
                        dst(aout[(t|((b>>4)&0xf))&0x3f]);
                        t = (b&0xf)<<2;
                        if ((b = src()) !== null)
                            dst(aout[(t|((b>>6)&0x3))&0x3f]),
                            dst(aout[b&0x3f]);
                        else
                            dst(aout[t&0x3f]),
                            dst(61);
                    } else
                        dst(aout[t&0x3f]),
                        dst(61),
                        dst(61);
                }
            };

            /**
             * Decodes base64 char codes to bytes.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
             * @throws {Error} If a character code is invalid
             */
            lxiv.decode = function(src, dst) {
                var c, t1, t2;
                function fail(c) {
                    throw Error("Illegal character code: "+c);
                }
                while ((c = src()) !== null) {
                    t1 = ain[c];
                    if (typeof t1 === 'undefined') fail(c);
                    if ((c = src()) !== null) {
                        t2 = ain[c];
                        if (typeof t2 === 'undefined') fail(c);
                        dst((t1<<2)>>>0|(t2&0x30)>>4);
                        if ((c = src()) !== null) {
                            t1 = ain[c];
                            if (typeof t1 === 'undefined')
                                if (c === 61) break; else fail(c);
                            dst(((t2&0xf)<<4)>>>0|(t1&0x3c)>>2);
                            if ((c = src()) !== null) {
                                t2 = ain[c];
                                if (typeof t2 === 'undefined')
                                    if (c === 61) break; else fail(c);
                                dst(((t1&0x3)<<6)>>>0|t2);
                            }
                        }
                    }
                }
            };

            /**
             * Tests if a string is valid base64.
             * @param {string} str String to test
             * @returns {boolean} `true` if valid, otherwise `false`
             */
            lxiv.test = function(str) {
                return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(str);
            };

            return lxiv;
        }();

        // encodings/base64

        /**
         * Encodes this ByteBuffer's contents to a base64 encoded string.
         * @param {number=} begin Offset to begin at, defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at, defaults to {@link ByteBuffer#limit}.
         * @returns {string} Base64 encoded string
         * @expose
         */
        ByteBufferPrototype.toBase64 = function(begin, end) {
            if (typeof begin === 'undefined')
                begin = this.offset;
            if (typeof end === 'undefined')
                end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var sd; lxiv.encode(function() {
                return begin < end ? this.view.getUint8(begin++) : null;
            }.bind(this), sd = stringDestination());
            return sd();
        };

        /**
         * Decodes a base64 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBase64 = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (str.length % 4 !== 0)
                    throw TypeError("Illegal str: Length not a multiple of 4");
            }
            var bb = new ByteBuffer(str.length/4*3, littleEndian, noAssert),
                i = 0;
            lxiv.decode(stringSource(str), function(b) {
                bb.view.setUint8(i++, b);
            });
            bb.limit = i;
            return bb;
        };

        /**
         * Encodes a binary string to base64 like `window.btoa` does.
         * @param {string} str Binary string
         * @returns {string} Base64 encoded string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.btoa
         * @expose
         */
        ByteBuffer.btoa = function(str) {
            return ByteBuffer.fromBinary(str).toBase64();
        };

        /**
         * Decodes a base64 encoded string to binary like `window.atob` does.
         * @param {string} b64 Base64 encoded string
         * @returns {string} Binary string
         * @see https://developer.mozilla.org/en-US/docs/Web/API/Window.atob
         * @expose
         */
        ByteBuffer.atob = function(b64) {
            return ByteBuffer.fromBase64(b64).toBinary();
        };

        // encodings/binary

        /**
         * Encodes this ByteBuffer to a binary encoded string, that is using only characters 0x00-0xFF as bytes.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Binary encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBufferPrototype.toBinary = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            if (begin === end)
                return "";
            var cc = [], pt = [];
            while (begin < end) {
                cc.push(this.view.getUint8(begin++));
                if (cc.length >= 1024)
                    pt.push(String.fromCharCode.apply(String, cc)),
                    cc = [];
            }
            return pt.join('') + String.fromCharCode.apply(String, cc);
        };

        /**
         * Decodes a binary encoded string, that is using only characters 0x00-0xFF as bytes, to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromBinary = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
            }
            var i = 0, k = str.length, charCode,
                bb = new ByteBuffer(k, littleEndian, noAssert);
            while (i<k) {
                charCode = str.charCodeAt(i);
                if (!noAssert && charCode > 255)
                    throw RangeError("Illegal charCode at "+i+": 0 <= "+charCode+" <= 255");
                bb.view.setUint8(i++, charCode);
            }
            bb.limit = k;
            return bb;
        };

        // encodings/debug

        /**
         * Encodes this ByteBuffer to a hex encoded string with marked offsets. Offset symbols are:
         * * `<` : offset,
         * * `'` : markedOffset,
         * * `>` : limit,
         * * `|` : offset and limit,
         * * `[` : offset and markedOffset,
         * * `]` : markedOffset and limit,
         * * `!` : offset, markedOffset and limit
         * @param {boolean=} columns If `true` returns two columns hex + ascii, defaults to `false`
         * @returns {string|!Array.<string>} Debug string or array of lines if `asArray = true`
         * @expose
         * @example `>00'01 02<03` contains four bytes with `limit=0, markedOffset=1, offset=3`
         * @example `00[01 02 03>` contains four bytes with `offset=markedOffset=1, limit=4`
         * @example `00|01 02 03` contains four bytes with `offset=limit=1, markedOffset=-1`
         * @example `|` contains zero bytes with `offset=limit=0, markedOffset=-1`
         */
        ByteBufferPrototype.toDebug = function(columns) {
            var i = -1,
                k = this.buffer.byteLength,
                b,
                hex = "",
                asc = "",
                out = "";
            while (i<k) {
                if (i !== -1) {
                    b = this.view.getUint8(i);
                    if (b < 0x10) hex += "0"+b.toString(16).toUpperCase();
                    else hex += b.toString(16).toUpperCase();
                    if (columns) {
                        asc += b > 32 && b < 127 ? String.fromCharCode(b) : '.';
                    }
                }
                ++i;
                if (columns) {
                    if (i > 0 && i % 16 === 0 && i !== k) {
                        while (hex.length < 3*16+3) hex += " ";
                        out += hex+asc+"\n";
                        hex = asc = "";
                    }
                }
                if (i === this.offset && i === this.limit)
                    hex += i === this.markedOffset ? "!" : "|";
                else if (i === this.offset)
                    hex += i === this.markedOffset ? "[" : "<";
                else if (i === this.limit)
                    hex += i === this.markedOffset ? "]" : ">";
                else
                    hex += i === this.markedOffset ? "'" : (columns || (i !== 0 && i !== k) ? " " : "");
            }
            if (columns && hex !== " ") {
                while (hex.length < 3*16+3) hex += " ";
                out += hex+asc+"\n";
            }
            return columns ? out : hex;
        };

        /**
         * Decodes a hex encoded string with marked offsets to a ByteBuffer.
         * @param {string} str Debug string to decode (not be generated with `columns = true`)
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         * @see ByteBuffer#toDebug
         */
        ByteBuffer.fromDebug = function(str, littleEndian, noAssert) {
            var k = str.length,
                bb = new ByteBuffer(((k+1)/3)|0, littleEndian, noAssert);
            var i = 0, j = 0, ch, b,
                rs = false, // Require symbol next
                ho = false, hm = false, hl = false, // Already has offset, markedOffset, limit?
                fail = false;
            while (i<k) {
                switch (ch = str.charAt(i++)) {
                    case '!':
                        if (!noAssert) {
                            if (ho || hm || hl) {
                                fail = true; break;
                            }
                            ho = hm = hl = true;
                        }
                        bb.offset = bb.markedOffset = bb.limit = j;
                        rs = false;
                        break;
                    case '|':
                        if (!noAssert) {
                            if (ho || hl) {
                                fail = true; break;
                            }
                            ho = hl = true;
                        }
                        bb.offset = bb.limit = j;
                        rs = false;
                        break;
                    case '[':
                        if (!noAssert) {
                            if (ho || hm) {
                                fail = true; break;
                            }
                            ho = hm = true;
                        }
                        bb.offset = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '<':
                        if (!noAssert) {
                            if (ho) {
                                fail = true; break;
                            }
                            ho = true;
                        }
                        bb.offset = j;
                        rs = false;
                        break;
                    case ']':
                        if (!noAssert) {
                            if (hl || hm) {
                                fail = true; break;
                            }
                            hl = hm = true;
                        }
                        bb.limit = bb.markedOffset = j;
                        rs = false;
                        break;
                    case '>':
                        if (!noAssert) {
                            if (hl) {
                                fail = true; break;
                            }
                            hl = true;
                        }
                        bb.limit = j;
                        rs = false;
                        break;
                    case "'":
                        if (!noAssert) {
                            if (hm) {
                                fail = true; break;
                            }
                            hm = true;
                        }
                        bb.markedOffset = j;
                        rs = false;
                        break;
                    case ' ':
                        rs = false;
                        break;
                    default:
                        if (!noAssert) {
                            if (rs) {
                                fail = true; break;
                            }
                        }
                        b = parseInt(ch+str.charAt(i++), 16);
                        if (!noAssert) {
                            if (isNaN(b) || b < 0 || b > 255)
                                throw TypeError("Illegal str: Not a debug encoded string");
                        }
                        bb.view.setUint8(j++, b);
                        rs = true;
                }
                if (fail)
                    throw TypeError("Illegal str: Invalid symbol at "+i);
            }
            if (!noAssert) {
                if (!ho || !hl)
                    throw TypeError("Illegal str: Missing offset or limit");
                if (j<bb.buffer.byteLength)
                    throw TypeError("Illegal str: Not a debug encoded string (is it hex?) "+j+" < "+k);
            }
            return bb;
        };

        // encodings/hex

        /**
         * Encodes this ByteBuffer's contents to a hex encoded string.
         * @param {number=} begin Offset to begin at. Defaults to {@link ByteBuffer#offset}.
         * @param {number=} end Offset to end at. Defaults to {@link ByteBuffer#limit}.
         * @returns {string} Hex encoded string
         * @expose
         */
        ByteBufferPrototype.toHex = function(begin, end) {
            begin = typeof begin === 'undefined' ? this.offset : begin;
            end = typeof end === 'undefined' ? this.limit : end;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var out = new Array(end - begin),
                b;
            while (begin < end) {
                b = this.view.getUint8(begin++);
                if (b < 0x10)
                    out.push("0", b.toString(16));
                else out.push(b.toString(16));
            }
            return out.join('');
        };

        /**
         * Decodes a hex encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromHex = function(str, littleEndian, noAssert) {
            if (!noAssert) {
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
                if (str.length % 2 !== 0)
                    throw TypeError("Illegal str: Length not a multiple of 2");
            }
            var k = str.length,
                bb = new ByteBuffer((k / 2) | 0, littleEndian),
                b;
            for (var i=0, j=0; i<k; i+=2) {
                b = parseInt(str.substring(i, i+2), 16);
                if (!noAssert)
                    if (!isFinite(b) || b < 0 || b > 255)
                        throw TypeError("Illegal str: Contains non-hex characters");
                bb.view.setUint8(j++, b);
            }
            bb.limit = j;
            return bb;
        };

        // utfx-embeddable

        /**
         * utfx-embeddable (c) 2014 Daniel Wirtz <dcode@dcode.io>
         * Released under the Apache License, Version 2.0
         * see: https://github.com/dcodeIO/utfx for details
         */
        var utfx = function() {
            "use strict";

            /**
             * utfx namespace.
             * @inner
             * @type {!Object.<string,*>}
             */
            var utfx = {};

            /**
             * Maximum valid code point.
             * @type {number}
             * @const
             */
            utfx.MAX_CODEPOINT = 0x10FFFF;

            /**
             * Encodes UTF8 code points to UTF8 bytes.
             * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
             *  respectively `null` if there are no more code points left or a single numeric code point.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte
             */
            utfx.encodeUTF8 = function(src, dst) {
                var cp = null;
                if (typeof src === 'number')
                    cp = src,
                    src = function() { return null; };
                while (cp !== null || (cp = src()) !== null) {
                    if (cp < 0x80)
                        dst(cp&0x7F);
                    else if (cp < 0x800)
                        dst(((cp>>6)&0x1F)|0xC0),
                        dst((cp&0x3F)|0x80);
                    else if (cp < 0x10000)
                        dst(((cp>>12)&0x0F)|0xE0),
                        dst(((cp>>6)&0x3F)|0x80),
                        dst((cp&0x3F)|0x80);
                    else
                        dst(((cp>>18)&0x07)|0xF0),
                        dst(((cp>>12)&0x3F)|0x80),
                        dst(((cp>>6)&0x3F)|0x80),
                        dst((cp&0x3F)|0x80);
                    cp = null;
                }
            };

            /**
             * Decodes UTF8 bytes to UTF8 code points.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
             *  are no more bytes left.
             * @param {!function(number)} dst Code points destination as a function successively called with each decoded code point.
             * @throws {RangeError} If a starting byte is invalid in UTF8
             * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the
             *  remaining bytes.
             */
            utfx.decodeUTF8 = function(src, dst) {
                var a, b, c, d, fail = function(b) {
                    b = b.slice(0, b.indexOf(null));
                    var err = Error(b.toString());
                    err.name = "TruncatedError";
                    err['bytes'] = b;
                    throw err;
                };
                while ((a = src()) !== null) {
                    if ((a&0x80) === 0)
                        dst(a);
                    else if ((a&0xE0) === 0xC0)
                        ((b = src()) === null) && fail([a, b]),
                        dst(((a&0x1F)<<6) | (b&0x3F));
                    else if ((a&0xF0) === 0xE0)
                        ((b=src()) === null || (c=src()) === null) && fail([a, b, c]),
                        dst(((a&0x0F)<<12) | ((b&0x3F)<<6) | (c&0x3F));
                    else if ((a&0xF8) === 0xF0)
                        ((b=src()) === null || (c=src()) === null || (d=src()) === null) && fail([a, b, c ,d]),
                        dst(((a&0x07)<<18) | ((b&0x3F)<<12) | ((c&0x3F)<<6) | (d&0x3F));
                    else throw RangeError("Illegal starting byte: "+a);
                }
            };

            /**
             * Converts UTF16 characters to UTF8 code points.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @param {!function(number)} dst Code points destination as a function successively called with each converted code
             *  point.
             */
            utfx.UTF16toUTF8 = function(src, dst) {
                var c1, c2 = null;
                while (true) {
                    if ((c1 = c2 !== null ? c2 : src()) === null)
                        break;
                    if (c1 >= 0xD800 && c1 <= 0xDFFF) {
                        if ((c2 = src()) !== null) {
                            if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
                                dst((c1-0xD800)*0x400+c2-0xDC00+0x10000);
                                c2 = null; continue;
                            }
                        }
                    }
                    dst(c1);
                }
                if (c2 !== null) dst(c2);
            };

            /**
             * Converts UTF8 code points to UTF16 characters.
             * @param {(!function():number|null) | number} src Code points source, either as a function returning the next code point
             *  respectively `null` if there are no more code points left or a single numeric code point.
             * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
             * @throws {RangeError} If a code point is out of range
             */
            utfx.UTF8toUTF16 = function(src, dst) {
                var cp = null;
                if (typeof src === 'number')
                    cp = src, src = function() { return null; };
                while (cp !== null || (cp = src()) !== null) {
                    if (cp <= 0xFFFF)
                        dst(cp);
                    else
                        cp -= 0x10000,
                        dst((cp>>10)+0xD800),
                        dst((cp%0x400)+0xDC00);
                    cp = null;
                }
            };

            /**
             * Converts and encodes UTF16 characters to UTF8 bytes.
             * @param {!function():number|null} src Characters source as a function returning the next char code respectively `null`
             *  if there are no more characters left.
             * @param {!function(number)} dst Bytes destination as a function successively called with the next byte.
             */
            utfx.encodeUTF16toUTF8 = function(src, dst) {
                utfx.UTF16toUTF8(src, function(cp) {
                    utfx.encodeUTF8(cp, dst);
                });
            };

            /**
             * Decodes and converts UTF8 bytes to UTF16 characters.
             * @param {!function():number|null} src Bytes source as a function returning the next byte respectively `null` if there
             *  are no more bytes left.
             * @param {!function(number)} dst Characters destination as a function successively called with each converted char code.
             * @throws {RangeError} If a starting byte is invalid in UTF8
             * @throws {Error} If the last sequence is truncated. Has an array property `bytes` holding the remaining bytes.
             */
            utfx.decodeUTF8toUTF16 = function(src, dst) {
                utfx.decodeUTF8(src, function(cp) {
                    utfx.UTF8toUTF16(cp, dst);
                });
            };

            /**
             * Calculates the byte length of an UTF8 code point.
             * @param {number} cp UTF8 code point
             * @returns {number} Byte length
             */
            utfx.calculateCodePoint = function(cp) {
                return (cp < 0x80) ? 1 : (cp < 0x800) ? 2 : (cp < 0x10000) ? 3 : 4;
            };

            /**
             * Calculates the number of UTF8 bytes required to store UTF8 code points.
             * @param {(!function():number|null)} src Code points source as a function returning the next code point respectively
             *  `null` if there are no more code points left.
             * @returns {number} The number of UTF8 bytes required
             */
            utfx.calculateUTF8 = function(src) {
                var cp, l=0;
                while ((cp = src()) !== null)
                    l += utfx.calculateCodePoint(cp);
                return l;
            };

            /**
             * Calculates the number of UTF8 code points respectively UTF8 bytes required to store UTF16 char codes.
             * @param {(!function():number|null)} src Characters source as a function returning the next char code respectively
             *  `null` if there are no more characters left.
             * @returns {!Array.<number>} The number of UTF8 code points at index 0 and the number of UTF8 bytes required at index 1.
             */
            utfx.calculateUTF16asUTF8 = function(src) {
                var n=0, l=0;
                utfx.UTF16toUTF8(src, function(cp) {
                    ++n; l += utfx.calculateCodePoint(cp);
                });
                return [n,l];
            };

            return utfx;
        }();

        // encodings/utf8

        /**
         * Encodes this ByteBuffer's contents between {@link ByteBuffer#offset} and {@link ByteBuffer#limit} to an UTF8 encoded
         *  string.
         * @returns {string} Hex encoded string
         * @throws {RangeError} If `offset > limit`
         * @expose
         */
        ByteBufferPrototype.toUTF8 = function(begin, end) {
            if (typeof begin === 'undefined') begin = this.offset;
            if (typeof end === 'undefined') end = this.limit;
            if (!this.noAssert) {
                if (typeof begin !== 'number' || begin % 1 !== 0)
                    throw TypeError("Illegal begin: Not an integer");
                begin >>>= 0;
                if (typeof end !== 'number' || end % 1 !== 0)
                    throw TypeError("Illegal end: Not an integer");
                end >>>= 0;
                if (begin < 0 || begin > end || end > this.buffer.byteLength)
                    throw RangeError("Illegal range: 0 <= "+begin+" <= "+end+" <= "+this.buffer.byteLength);
            }
            var sd; try {
                utfx.decodeUTF8toUTF16(function() {
                    return begin < end ? this.view.getUint8(begin++) : null;
                }.bind(this), sd = stringDestination());
            } catch (e) {
                if (begin !== end)
                    throw RangeError("Illegal range: Truncated data, "+begin+" != "+end);
            }
            return sd();
        };

        /**
         * Decodes an UTF8 encoded string to a ByteBuffer.
         * @param {string} str String to decode
         * @param {boolean=} littleEndian Whether to use little or big endian byte order. Defaults to
         *  {@link ByteBuffer.DEFAULT_ENDIAN}.
         * @param {boolean=} noAssert Whether to skip assertions of offsets and values. Defaults to
         *  {@link ByteBuffer.DEFAULT_NOASSERT}.
         * @returns {!ByteBuffer} ByteBuffer
         * @expose
         */
        ByteBuffer.fromUTF8 = function(str, littleEndian, noAssert) {
            if (!noAssert)
                if (typeof str !== 'string')
                    throw TypeError("Illegal str: Not a string");
            var bb = new ByteBuffer(utfx.calculateUTF16asUTF8(stringSource(str), true)[1], littleEndian, noAssert),
                i = 0;
            utfx.encodeUTF16toUTF8(stringSource(str), function(b) {
                bb.view.setUint8(i++, b);
            });
            bb.limit = i;
            return bb;
        };


        return ByteBuffer;
    }

    /* CommonJS */ if (typeof require === 'function' && typeof module === 'object' && module && typeof exports === 'object' && exports)
        module['exports'] = (function() {
            var Long; try { Long = require("long"); } catch (e) {}
            return loadByteBuffer(Long);
        })();
    /* AMD */ else if (typeof define === 'function' && define["amd"])
        define("ByteBuffer", ["Long"], function(Long) { return loadByteBuffer(Long); });
    /* Global */ else
        (global["dcodeIO"] = global["dcodeIO"] || {})["ByteBuffer"] = loadByteBuffer(global["dcodeIO"]["Long"]);

})(this);

/*
 Copyright 2013 Daniel Wirtz <dcode@dcode.io>

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

/**
 * @license protobuf.js (c) 2013 Daniel Wirtz <dcode@dcode.io>
 * Released under the Apache License, Version 2.0
 * see: https://github.com/dcodeIO/protobuf.js for details
 */
(function(global, factory) {

    /* AMD */ if (typeof define === 'function' && define["amd"])
        define(["bytebuffer"], factory);
    /* CommonJS */ else if (typeof require === "function" && typeof module === "object" && module && module["exports"])
        module["exports"] = factory(require("bytebuffer"), true);
    /* Global */ else
        (global["dcodeIO"] = global["dcodeIO"] || {})["ProtoBuf"] = factory(global["dcodeIO"]["ByteBuffer"]);

})(this, function(ByteBuffer, isCommonJS) {
    "use strict";

    /**
     * The ProtoBuf namespace.
     * @exports ProtoBuf
     * @namespace
     * @expose
     */
    var ProtoBuf = {};

    /**
     * @type {!function(new: ByteBuffer, ...[*])}
     * @expose
     */
    ProtoBuf.ByteBuffer = ByteBuffer;

    /**
     * @type {?function(new: Long, ...[*])}
     * @expose
     */
    ProtoBuf.Long = ByteBuffer.Long || null;

    /**
     * ProtoBuf.js version.
     * @type {string}
     * @const
     * @expose
     */
    ProtoBuf.VERSION = "5.0.1";

    /**
     * Wire types.
     * @type {Object.<string,number>}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES = {};

    /**
     * Varint wire type.
     * @type {number}
     * @expose
     */
    ProtoBuf.WIRE_TYPES.VARINT = 0;

    /**
     * Fixed 64 bits wire type.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES.BITS64 = 1;

    /**
     * Length delimited wire type.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES.LDELIM = 2;

    /**
     * Start group wire type.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES.STARTGROUP = 3;

    /**
     * End group wire type.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES.ENDGROUP = 4;

    /**
     * Fixed 32 bits wire type.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.WIRE_TYPES.BITS32 = 5;

    /**
     * Packable wire types.
     * @type {!Array.<number>}
     * @const
     * @expose
     */
    ProtoBuf.PACKABLE_WIRE_TYPES = [
        ProtoBuf.WIRE_TYPES.VARINT,
        ProtoBuf.WIRE_TYPES.BITS64,
        ProtoBuf.WIRE_TYPES.BITS32
    ];

    /**
     * Types.
     * @dict
     * @type {!Object.<string,{name: string, wireType: number, defaultValue: *}>}
     * @const
     * @expose
     */
    ProtoBuf.TYPES = {
        // According to the protobuf spec.
        "int32": {
            name: "int32",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: 0
        },
        "uint32": {
            name: "uint32",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: 0
        },
        "sint32": {
            name: "sint32",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: 0
        },
        "int64": {
            name: "int64",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: ProtoBuf.Long ? ProtoBuf.Long.ZERO : undefined
        },
        "uint64": {
            name: "uint64",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: ProtoBuf.Long ? ProtoBuf.Long.UZERO : undefined
        },
        "sint64": {
            name: "sint64",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: ProtoBuf.Long ? ProtoBuf.Long.ZERO : undefined
        },
        "bool": {
            name: "bool",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: false
        },
        "double": {
            name: "double",
            wireType: ProtoBuf.WIRE_TYPES.BITS64,
            defaultValue: 0
        },
        "string": {
            name: "string",
            wireType: ProtoBuf.WIRE_TYPES.LDELIM,
            defaultValue: ""
        },
        "bytes": {
            name: "bytes",
            wireType: ProtoBuf.WIRE_TYPES.LDELIM,
            defaultValue: null // overridden in the code, must be a unique instance
        },
        "fixed32": {
            name: "fixed32",
            wireType: ProtoBuf.WIRE_TYPES.BITS32,
            defaultValue: 0
        },
        "sfixed32": {
            name: "sfixed32",
            wireType: ProtoBuf.WIRE_TYPES.BITS32,
            defaultValue: 0
        },
        "fixed64": {
            name: "fixed64",
            wireType: ProtoBuf.WIRE_TYPES.BITS64,
            defaultValue:  ProtoBuf.Long ? ProtoBuf.Long.UZERO : undefined
        },
        "sfixed64": {
            name: "sfixed64",
            wireType: ProtoBuf.WIRE_TYPES.BITS64,
            defaultValue: ProtoBuf.Long ? ProtoBuf.Long.ZERO : undefined
        },
        "float": {
            name: "float",
            wireType: ProtoBuf.WIRE_TYPES.BITS32,
            defaultValue: 0
        },
        "enum": {
            name: "enum",
            wireType: ProtoBuf.WIRE_TYPES.VARINT,
            defaultValue: 0
        },
        "message": {
            name: "message",
            wireType: ProtoBuf.WIRE_TYPES.LDELIM,
            defaultValue: null
        },
        "group": {
            name: "group",
            wireType: ProtoBuf.WIRE_TYPES.STARTGROUP,
            defaultValue: null
        }
    };

    /**
     * Valid map key types.
     * @type {!Array.<!Object.<string,{name: string, wireType: number, defaultValue: *}>>}
     * @const
     * @expose
     */
    ProtoBuf.MAP_KEY_TYPES = [
        ProtoBuf.TYPES["int32"],
        ProtoBuf.TYPES["sint32"],
        ProtoBuf.TYPES["sfixed32"],
        ProtoBuf.TYPES["uint32"],
        ProtoBuf.TYPES["fixed32"],
        ProtoBuf.TYPES["int64"],
        ProtoBuf.TYPES["sint64"],
        ProtoBuf.TYPES["sfixed64"],
        ProtoBuf.TYPES["uint64"],
        ProtoBuf.TYPES["fixed64"],
        ProtoBuf.TYPES["bool"],
        ProtoBuf.TYPES["string"],
        ProtoBuf.TYPES["bytes"]
    ];

    /**
     * Minimum field id.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.ID_MIN = 1;

    /**
     * Maximum field id.
     * @type {number}
     * @const
     * @expose
     */
    ProtoBuf.ID_MAX = 0x1FFFFFFF;

    /**
     * If set to `true`, field names will be converted from underscore notation to camel case. Defaults to `false`.
     *  Must be set prior to parsing.
     * @type {boolean}
     * @expose
     */
    ProtoBuf.convertFieldsToCamelCase = false;

    /**
     * By default, messages are populated with (setX, set_x) accessors for each field. This can be disabled by
     *  setting this to `false` prior to building messages.
     * @type {boolean}
     * @expose
     */
    ProtoBuf.populateAccessors = true;

    /**
     * By default, messages are populated with default values if a field is not present on the wire. To disable
     *  this behavior, set this setting to `false`.
     * @type {boolean}
     * @expose
     */
    ProtoBuf.populateDefaults = true;

    /**
     * @alias ProtoBuf.Util
     * @expose
     */
    ProtoBuf.Util = (function() {
        "use strict";

        /**
         * ProtoBuf utilities.
         * @exports ProtoBuf.Util
         * @namespace
         */
        var Util = {};

        /**
         * Flag if running in node or not.
         * @type {boolean}
         * @const
         * @expose
         */
        Util.IS_NODE = !!(
            typeof process === 'object' && process+'' === '[object process]' && !process['browser']
        );

        /**
         * Constructs a XMLHttpRequest object.
         * @return {XMLHttpRequest}
         * @throws {Error} If XMLHttpRequest is not supported
         * @expose
         */
        Util.XHR = function() {
            // No dependencies please, ref: http://www.quirksmode.org/js/xmlhttp.html
            var XMLHttpFactories = [
                function () {return new XMLHttpRequest()},
                function () {return new ActiveXObject("Msxml2.XMLHTTP")},
                function () {return new ActiveXObject("Msxml3.XMLHTTP")},
                function () {return new ActiveXObject("Microsoft.XMLHTTP")}
            ];
            /** @type {?XMLHttpRequest} */
            var xhr = null;
            for (var i=0;i<XMLHttpFactories.length;i++) {
                try { xhr = XMLHttpFactories[i](); }
                catch (e) { continue; }
                break;
            }
            if (!xhr)
                throw Error("XMLHttpRequest is not supported");
            return xhr;
        };

        /**
         * Fetches a resource.
         * @param {string} path Resource path
         * @param {function(?string)=} callback Callback receiving the resource's contents. If omitted the resource will
         *   be fetched synchronously. If the request failed, contents will be null.
         * @return {?string|undefined} Resource contents if callback is omitted (null if the request failed), else undefined.
         * @expose
         */
        Util.fetch = function(path, callback) {
            if (callback && typeof callback != 'function')
                callback = null;
            if (Util.IS_NODE) {
                var fs = require("fs");
                if (callback) {
                    fs.readFile(path, function(err, data) {
                        if (err)
                            callback(null);
                        else
                            callback(""+data);
                    });
                } else
                    try {
                        return fs.readFileSync(path);
                    } catch (e) {
                        return null;
                    }
            } else {
                var xhr = Util.XHR();
                xhr.open('GET', path, callback ? true : false);
                // xhr.setRequestHeader('User-Agent', 'XMLHTTP/1.0');
                xhr.setRequestHeader('Accept', 'text/plain');
                if (typeof xhr.overrideMimeType === 'function') xhr.overrideMimeType('text/plain');
                if (callback) {
                    xhr.onreadystatechange = function() {
                        if (xhr.readyState != 4) return;
                        if (/* remote */ xhr.status == 200 || /* local */ (xhr.status == 0 && typeof xhr.responseText === 'string'))
                            callback(xhr.responseText);
                        else
                            callback(null);
                    };
                    if (xhr.readyState == 4)
                        return;
                    xhr.send(null);
                } else {
                    xhr.send(null);
                    if (/* remote */ xhr.status == 200 || /* local */ (xhr.status == 0 && typeof xhr.responseText === 'string'))
                        return xhr.responseText;
                    return null;
                }
            }
        };

        /**
         * Converts a string to camel case.
         * @param {string} str
         * @returns {string}
         * @expose
         */
        Util.toCamelCase = function(str) {
            return str.replace(/_([a-zA-Z])/g, function ($0, $1) {
                return $1.toUpperCase();
            });
        };

        return Util;
    })();

    /**
     * Language expressions.
     * @type {!Object.<string,!RegExp>}
     * @expose
     */
    ProtoBuf.Lang = {

        // Characters always ending a statement
        DELIM: /[\s\{\}=;:\[\],'"\(\)<>]/g,

        // Field rules
        RULE: /^(?:required|optional|repeated|map)$/,

        // Field types
        TYPE: /^(?:double|float|int32|uint32|sint32|int64|uint64|sint64|fixed32|sfixed32|fixed64|sfixed64|bool|string|bytes)$/,

        // Names
        NAME: /^[a-zA-Z_][a-zA-Z_0-9]*$/,

        // Type definitions
        TYPEDEF: /^[a-zA-Z][a-zA-Z_0-9]*$/,

        // Type references
        TYPEREF: /^(?:\.?[a-zA-Z_][a-zA-Z_0-9]*)+$/,

        // Fully qualified type references
        FQTYPEREF: /^(?:\.[a-zA-Z][a-zA-Z_0-9]*)+$/,

        // All numbers
        NUMBER: /^-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+|([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?)|inf|nan)$/,

        // Decimal numbers
        NUMBER_DEC: /^(?:[1-9][0-9]*|0)$/,

        // Hexadecimal numbers
        NUMBER_HEX: /^0[xX][0-9a-fA-F]+$/,

        // Octal numbers
        NUMBER_OCT: /^0[0-7]+$/,

        // Floating point numbers
        NUMBER_FLT: /^([0-9]*(\.[0-9]*)?([Ee][+-]?[0-9]+)?|inf|nan)$/,

        // Booleans
        BOOL: /^(?:true|false)$/i,

        // Id numbers
        ID: /^(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,

        // Negative id numbers (enum values)
        NEGID: /^\-?(?:[1-9][0-9]*|0|0[xX][0-9a-fA-F]+|0[0-7]+)$/,

        // Whitespaces
        WHITESPACE: /\s/,

        // All strings
        STRING: /(?:"([^"\\]*(?:\\.[^"\\]*)*)")|(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g,

        // Double quoted strings
        STRING_DQ: /(?:"([^"\\]*(?:\\.[^"\\]*)*)")/g,

        // Single quoted strings
        STRING_SQ: /(?:'([^'\\]*(?:\\.[^'\\]*)*)')/g
    };

    /**
     * @alias ProtoBuf.DotProto
     * @expose
     */
    ProtoBuf.DotProto = (function(ProtoBuf, Lang) {
        "use strict";

        /**
         * Utilities to parse .proto files.
         * @exports ProtoBuf.DotProto
         * @namespace
         */
        var DotProto = {};

        /**
         * Constructs a new Tokenizer.
         * @exports ProtoBuf.DotProto.Tokenizer
         * @class prototype tokenizer
         * @param {string} proto Proto to tokenize
         * @constructor
         */
        var Tokenizer = function(proto) {

            /**
             * Source to parse.
             * @type {string}
             * @expose
             */
            this.source = proto+"";

            /**
             * Current index.
             * @type {number}
             * @expose
             */
            this.index = 0;

            /**
             * Current line.
             * @type {number}
             * @expose
             */
            this.line = 1;

            /**
             * Token stack.
             * @type {!Array.<string>}
             * @expose
             */
            this.stack = [];

            /**
             * Opening character of the current string read, if any.
             * @type {?string}
             * @private
             */
            this._stringOpen = null;
        };

        /**
         * @alias ProtoBuf.DotProto.Tokenizer.prototype
         * @inner
         */
        var TokenizerPrototype = Tokenizer.prototype;

        /**
         * Reads a string beginning at the current index.
         * @return {string}
         * @private
         */
        TokenizerPrototype._readString = function() {
            var re = this._stringOpen === '"'
                ? Lang.STRING_DQ
                : Lang.STRING_SQ;
            re.lastIndex = this.index - 1; // Include the open quote
            var match = re.exec(this.source);
            if (!match)
                throw Error("unterminated string");
            this.index = re.lastIndex;
            this.stack.push(this._stringOpen);
            this._stringOpen = null;
            return match[1];
        };

        /**
         * Gets the next token and advances by one.
         * @return {?string} Token or `null` on EOF
         * @expose
         */
        TokenizerPrototype.next = function() {
            if (this.stack.length > 0)
                return this.stack.shift();
            if (this.index >= this.source.length)
                return null;
            if (this._stringOpen !== null)
                return this._readString();

            var repeat,
                prev,
                next;
            do {
                repeat = false;

                // Strip white spaces
                while (Lang.WHITESPACE.test(next = this.source.charAt(this.index))) {
                    if (next === '\n')
                        ++this.line;
                    if (++this.index === this.source.length)
                        return null;
                }

                // Strip comments
                if (this.source.charAt(this.index) === '/') {
                    ++this.index;
                    if (this.source.charAt(this.index) === '/') { // Line
                        while (this.source.charAt(++this.index) !== '\n')
                            if (this.index == this.source.length)
                                return null;
                        ++this.index;
                        ++this.line;
                        repeat = true;
                    } else if ((next = this.source.charAt(this.index)) === '*') { /* Block */
                        do {
                            if (next === '\n')
                                ++this.line;
                            if (++this.index === this.source.length)
                                return null;
                            prev = next;
                            next = this.source.charAt(this.index);
                        } while (prev !== '*' || next !== '/');
                        ++this.index;
                        repeat = true;
                    } else
                        return '/';
                }
            } while (repeat);

            if (this.index === this.source.length)
                return null;

            // Read the next token
            var end = this.index;
            Lang.DELIM.lastIndex = 0;
            var delim = Lang.DELIM.test(this.source.charAt(end++));
            if (!delim)
                while(end < this.source.length && !Lang.DELIM.test(this.source.charAt(end)))
                    ++end;
            var token = this.source.substring(this.index, this.index = end);
            if (token === '"' || token === "'")
                this._stringOpen = token;
            return token;
        };

        /**
         * Peeks for the next token.
         * @return {?string} Token or `null` on EOF
         * @expose
         */
        TokenizerPrototype.peek = function() {
            if (this.stack.length === 0) {
                var token = this.next();
                if (token === null)
                    return null;
                this.stack.push(token);
            }
            return this.stack[0];
        };

        /**
         * Skips a specific token and throws if it differs.
         * @param {string} expected Expected token
         * @throws {Error} If the actual token differs
         */
        TokenizerPrototype.skip = function(expected) {
            var actual = this.next();
            if (actual !== expected)
                throw Error("illegal '"+actual+"', '"+expected+"' expected");
        };

        /**
         * Omits an optional token.
         * @param {string} expected Expected optional token
         * @returns {boolean} `true` if the token exists
         */
        TokenizerPrototype.omit = function(expected) {
            if (this.peek() === expected) {
                this.next();
                return true;
            }
            return false;
        };

        /**
         * Returns a string representation of this object.
         * @return {string} String representation as of "Tokenizer(index/length)"
         * @expose
         */
        TokenizerPrototype.toString = function() {
            return "Tokenizer ("+this.index+"/"+this.source.length+" at line "+this.line+")";
        };

        /**
         * @alias ProtoBuf.DotProto.Tokenizer
         * @expose
         */
        DotProto.Tokenizer = Tokenizer;

        /**
         * Constructs a new Parser.
         * @exports ProtoBuf.DotProto.Parser
         * @class prototype parser
         * @param {string} source Source
         * @constructor
         */
        var Parser = function(source) {

            /**
             * Tokenizer.
             * @type {!ProtoBuf.DotProto.Tokenizer}
             * @expose
             */
            this.tn = new Tokenizer(source);

            /**
             * Whether parsing proto3 or not.
             * @type {boolean}
             */
            this.proto3 = false;
        };

        /**
         * @alias ProtoBuf.DotProto.Parser.prototype
         * @inner
         */
        var ParserPrototype = Parser.prototype;

        /**
         * Parses the source.
         * @returns {!Object}
         * @throws {Error} If the source cannot be parsed
         * @expose
         */
        ParserPrototype.parse = function() {
            var topLevel = {
                "name": "[ROOT]", // temporary
                "package": null,
                "messages": [],
                "enums": [],
                "imports": [],
                "options": {},
                "services": []
                // "syntax": undefined
            };
            var token,
                head = true,
                weak;
            try {
                while (token = this.tn.next()) {
                    switch (token) {
                        case 'package':
                            if (!head || topLevel["package"] !== null)
                                throw Error("unexpected 'package'");
                            token = this.tn.next();
                            if (!Lang.TYPEREF.test(token))
                                throw Error("illegal package name: " + token);
                            this.tn.skip(";");
                            topLevel["package"] = token;
                            break;
                        case 'import':
                            if (!head)
                                throw Error("unexpected 'import'");
                            token = this.tn.peek();
                            if (token === "public" || (weak = token === "weak")) // token ignored
                                this.tn.next();
                            token = this._readString();
                            this.tn.skip(";");
                            if (!weak) // import ignored
                                topLevel["imports"].push(token);
                            break;
                        case 'syntax':
                            if (!head)
                                throw Error("unexpected 'syntax'");
                            this.tn.skip("=");
                            if ((topLevel["syntax"] = this._readString()) === "proto3")
                                this.proto3 = true;
                            this.tn.skip(";");
                            break;
                        case 'message':
                            this._parseMessage(topLevel, null);
                            head = false;
                            break;
                        case 'enum':
                            this._parseEnum(topLevel);
                            head = false;
                            break;
                        case 'option':
                            this._parseOption(topLevel);
                            break;
                        case 'service':
                            this._parseService(topLevel);
                            break;
                        case 'extend':
                            this._parseExtend(topLevel);
                            break;
                        default:
                            throw Error("unexpected '" + token + "'");
                    }
                }
            } catch (e) {
                e.message = "Parse error at line "+this.tn.line+": " + e.message;
                throw e;
            }
            delete topLevel["name"];
            return topLevel;
        };

        /**
         * Parses the specified source.
         * @returns {!Object}
         * @throws {Error} If the source cannot be parsed
         * @expose
         */
        Parser.parse = function(source) {
            return new Parser(source).parse();
        };

        // ----- Conversion ------

        /**
         * Converts a numerical string to an id.
         * @param {string} value
         * @param {boolean=} mayBeNegative
         * @returns {number}
         * @inner
         */
        function mkId(value, mayBeNegative) {
            var id = -1,
                sign = 1;
            if (value.charAt(0) == '-') {
                sign = -1;
                value = value.substring(1);
            }
            if (Lang.NUMBER_DEC.test(value))
                id = parseInt(value);
            else if (Lang.NUMBER_HEX.test(value))
                id = parseInt(value.substring(2), 16);
            else if (Lang.NUMBER_OCT.test(value))
                id = parseInt(value.substring(1), 8);
            else
                throw Error("illegal id value: " + (sign < 0 ? '-' : '') + value);
            id = (sign*id)|0; // Force to 32bit
            if (!mayBeNegative && id < 0)
                throw Error("illegal id value: " + (sign < 0 ? '-' : '') + value);
            return id;
        }

        /**
         * Converts a numerical string to a number.
         * @param {string} val
         * @returns {number}
         * @inner
         */
        function mkNumber(val) {
            var sign = 1;
            if (val.charAt(0) == '-') {
                sign = -1;
                val = val.substring(1);
            }
            if (Lang.NUMBER_DEC.test(val))
                return sign * parseInt(val, 10);
            else if (Lang.NUMBER_HEX.test(val))
                return sign * parseInt(val.substring(2), 16);
            else if (Lang.NUMBER_OCT.test(val))
                return sign * parseInt(val.substring(1), 8);
            else if (val === 'inf')
                return sign * Infinity;
            else if (val === 'nan')
                return NaN;
            else if (Lang.NUMBER_FLT.test(val))
                return sign * parseFloat(val);
            throw Error("illegal number value: " + (sign < 0 ? '-' : '') + val);
        }

        // ----- Reading ------

        /**
         * Reads a string.
         * @returns {string}
         * @private
         */
        ParserPrototype._readString = function() {
            var value = "",
                token,
                delim;
            do {
                delim = this.tn.next();
                if (delim !== "'" && delim !== '"')
                    throw Error("illegal string delimiter: "+delim);
                value += this.tn.next();
                this.tn.skip(delim);
                token = this.tn.peek();
            } while (token === '"' || token === '"'); // multi line?
            return value;
        };

        /**
         * Reads a value.
         * @param {boolean=} mayBeTypeRef
         * @returns {number|boolean|string}
         * @private
         */
        ParserPrototype._readValue = function(mayBeTypeRef) {
            var token = this.tn.peek(),
                value;
            if (token === '"' || token === "'")
                return this._readString();
            this.tn.next();
            if (Lang.NUMBER.test(token))
                return mkNumber(token);
            if (Lang.BOOL.test(token))
                return (token.toLowerCase() === 'true');
            if (mayBeTypeRef && Lang.TYPEREF.test(token))
                return token;
            throw Error("illegal value: "+token);

        };

        // ----- Parsing constructs -----

        /**
         * Parses a namespace option.
         * @param {!Object} parent Parent definition
         * @param {boolean=} isList
         * @private
         */
        ParserPrototype._parseOption = function(parent, isList) {
            var token = this.tn.next(),
                custom = false;
            if (token === '(') {
                custom = true;
                token = this.tn.next();
            }
            if (!Lang.TYPEREF.test(token))
                // we can allow options of the form google.protobuf.* since they will just get ignored anyways
                // if (!/google\.protobuf\./.test(token)) // FIXME: Why should that not be a valid typeref?
                    throw Error("illegal option name: "+token);
            var name = token;
            if (custom) { // (my_method_option).foo, (my_method_option), some_method_option, (foo.my_option).bar
                this.tn.skip(')');
                name = '('+name+')';
                token = this.tn.peek();
                if (Lang.FQTYPEREF.test(token)) {
                    name += token;
                    this.tn.next();
                }
            }
            this.tn.skip('=');
            this._parseOptionValue(parent, name);
            if (!isList)
                this.tn.skip(";");
        };

        /**
         * Sets an option on the specified options object.
         * @param {!Object.<string,*>} options
         * @param {string} name
         * @param {string|number|boolean} value
         * @inner
         */
        function setOption(options, name, value) {
            if (typeof options[name] === 'undefined')
                options[name] = value;
            else {
                if (!Array.isArray(options[name]))
                    options[name] = [ options[name] ];
                options[name].push(value);
            }
        }

        /**
         * Parses an option value.
         * @param {!Object} parent
         * @param {string} name
         * @private
         */
        ParserPrototype._parseOptionValue = function(parent, name) {
            var token = this.tn.peek();
            if (token !== '{') { // Plain value
                setOption(parent["options"], name, this._readValue(true));
            } else { // Aggregate options
                this.tn.skip("{");
                while ((token = this.tn.next()) !== '}') {
                    if (!Lang.NAME.test(token))
                        throw Error("illegal option name: " + name + "." + token);
                    if (this.tn.omit(":"))
                        setOption(parent["options"], name + "." + token, this._readValue(true));
                    else
                        this._parseOptionValue(parent, name + "." + token);
                }
            }
        };

        /**
         * Parses a service definition.
         * @param {!Object} parent Parent definition
         * @private
         */
        ParserPrototype._parseService = function(parent) {
            var token = this.tn.next();
            if (!Lang.NAME.test(token))
                throw Error("illegal service name at line "+this.tn.line+": "+token);
            var name = token;
            var svc = {
                "name": name,
                "rpc": {},
                "options": {}
            };
            this.tn.skip("{");
            while ((token = this.tn.next()) !== '}') {
                if (token === "option")
                    this._parseOption(svc);
                else if (token === 'rpc')
                    this._parseServiceRPC(svc);
                else
                    throw Error("illegal service token: "+token);
            }
            this.tn.omit(";");
            parent["services"].push(svc);
        };

        /**
         * Parses a RPC service definition of the form ['rpc', name, (request), 'returns', (response)].
         * @param {!Object} svc Service definition
         * @private
         */
        ParserPrototype._parseServiceRPC = function(svc) {
            var type = "rpc",
                token = this.tn.next();
            if (!Lang.NAME.test(token))
                throw Error("illegal rpc service method name: "+token);
            var name = token;
            var method = {
                "request": null,
                "response": null,
                "request_stream": false,
                "response_stream": false,
                "options": {}
            };
            this.tn.skip("(");
            token = this.tn.next();
            if (token.toLowerCase() === "stream") {
              method["request_stream"] = true;
              token = this.tn.next();
            }
            if (!Lang.TYPEREF.test(token))
                throw Error("illegal rpc service request type: "+token);
            method["request"] = token;
            this.tn.skip(")");
            token = this.tn.next();
            if (token.toLowerCase() !== "returns")
                throw Error("illegal rpc service request type delimiter: "+token);
            this.tn.skip("(");
            token = this.tn.next();
            if (token.toLowerCase() === "stream") {
              method["response_stream"] = true;
              token = this.tn.next();
            }
            method["response"] = token;
            this.tn.skip(")");
            token = this.tn.peek();
            if (token === '{') {
                this.tn.next();
                while ((token = this.tn.next()) !== '}') {
                    if (token === 'option')
                        this._parseOption(method);
                    else
                        throw Error("illegal rpc service token: " + token);
                }
                this.tn.omit(";");
            } else
                this.tn.skip(";");
            if (typeof svc[type] === 'undefined')
                svc[type] = {};
            svc[type][name] = method;
        };

        /**
         * Parses a message definition.
         * @param {!Object} parent Parent definition
         * @param {!Object=} fld Field definition if this is a group
         * @returns {!Object}
         * @private
         */
        ParserPrototype._parseMessage = function(parent, fld) {
            var isGroup = !!fld,
                token = this.tn.next();
            var msg = {
                "name": "",
                "fields": [],
                "enums": [],
                "messages": [],
                "options": {},
                "services": [],
                "oneofs": {}
                // "extensions": undefined
            };
            if (!Lang.NAME.test(token))
                throw Error("illegal "+(isGroup ? "group" : "message")+" name: "+token);
            msg["name"] = token;
            if (isGroup) {
                this.tn.skip("=");
                fld["id"] = mkId(this.tn.next());
                msg["isGroup"] = true;
            }
            token = this.tn.peek();
            if (token === '[' && fld)
                this._parseFieldOptions(fld);
            this.tn.skip("{");
            while ((token = this.tn.next()) !== '}') {
                if (Lang.RULE.test(token))
                    this._parseMessageField(msg, token);
                else if (token === "oneof")
                    this._parseMessageOneOf(msg);
                else if (token === "enum")
                    this._parseEnum(msg);
                else if (token === "message")
                    this._parseMessage(msg);
                else if (token === "option")
                    this._parseOption(msg);
                else if (token === "service")
                    this._parseService(msg);
                else if (token === "extensions")
                    msg["extensions"] = this._parseExtensionRanges();
                else if (token === "reserved")
                    this._parseIgnored(); // TODO
                else if (token === "extend")
                    this._parseExtend(msg);
                else if (Lang.TYPEREF.test(token)) {
                    if (!this.proto3)
                        throw Error("illegal field rule: "+token);
                    this._parseMessageField(msg, "optional", token);
                } else
                    throw Error("illegal message token: "+token);
            }
            this.tn.omit(";");
            parent["messages"].push(msg);
            return msg;
        };

        /**
         * Parses an ignored statement.
         * @private
         */
        ParserPrototype._parseIgnored = function() {
            while (this.tn.peek() !== ';')
                this.tn.next();
            this.tn.skip(";");
        };

        /**
         * Parses a message field.
         * @param {!Object} msg Message definition
         * @param {string} rule Field rule
         * @param {string=} type Field type if already known (never known for maps)
         * @returns {!Object} Field descriptor
         * @private
         */
        ParserPrototype._parseMessageField = function(msg, rule, type) {
            if (!Lang.RULE.test(rule))
                throw Error("illegal message field rule: "+rule);
            var fld = {
                "rule": rule,
                "type": "",
                "name": "",
                "options": {},
                "id": 0
            };
            var token;
            if (rule === "map") {

                if (type)
                    throw Error("illegal type: " + type);
                this.tn.skip('<');
                token = this.tn.next();
                if (!Lang.TYPE.test(token) && !Lang.TYPEREF.test(token))
                    throw Error("illegal message field type: " + token);
                fld["keytype"] = token;
                this.tn.skip(',');
                token = this.tn.next();
                if (!Lang.TYPE.test(token) && !Lang.TYPEREF.test(token))
                    throw Error("illegal message field: " + token);
                fld["type"] = token;
                this.tn.skip('>');
                token = this.tn.next();
                if (!Lang.NAME.test(token))
                    throw Error("illegal message field name: " + token);
                fld["name"] = token;
                this.tn.skip("=");
                fld["id"] = mkId(this.tn.next());
                token = this.tn.peek();
                if (token === '[')
                    this._parseFieldOptions(fld);
                this.tn.skip(";");

            } else {

                type = typeof type !== 'undefined' ? type : this.tn.next();

                if (type === "group") {

                    // "A [legacy] group simply combines a nested message type and a field into a single declaration. In your
                    // code, you can treat this message just as if it had a Result type field called result (the latter name is
                    // converted to lower-case so that it does not conflict with the former)."
                    var grp = this._parseMessage(msg, fld);
                    if (!/^[A-Z]/.test(grp["name"]))
                        throw Error('illegal group name: '+grp["name"]);
                    fld["type"] = grp["name"];
                    fld["name"] = grp["name"].toLowerCase();
                    this.tn.omit(";");

                } else {

                    if (!Lang.TYPE.test(type) && !Lang.TYPEREF.test(type))
                        throw Error("illegal message field type: " + type);
                    fld["type"] = type;
                    token = this.tn.next();
                    if (!Lang.NAME.test(token))
                        throw Error("illegal message field name: " + token);
                    fld["name"] = token;
                    this.tn.skip("=");
                    fld["id"] = mkId(this.tn.next());
                    token = this.tn.peek();
                    if (token === "[")
                        this._parseFieldOptions(fld);
                    this.tn.skip(";");

                }
            }
            msg["fields"].push(fld);
            return fld;
        };

        /**
         * Parses a message oneof.
         * @param {!Object} msg Message definition
         * @private
         */
        ParserPrototype._parseMessageOneOf = function(msg) {
            var token = this.tn.next();
            if (!Lang.NAME.test(token))
                throw Error("illegal oneof name: "+token);
            var name = token,
                fld;
            var fields = [];
            this.tn.skip("{");
            while ((token = this.tn.next()) !== "}") {
                fld = this._parseMessageField(msg, "optional", token);
                fld["oneof"] = name;
                fields.push(fld["id"]);
            }
            this.tn.omit(";");
            msg["oneofs"][name] = fields;
        };

        /**
         * Parses a set of field option definitions.
         * @param {!Object} fld Field definition
         * @private
         */
        ParserPrototype._parseFieldOptions = function(fld) {
            this.tn.skip("[");
            var token,
                first = true;
            while ((token = this.tn.peek()) !== ']') {
                if (!first)
                    this.tn.skip(",");
                this._parseOption(fld, true);
                first = false;
            }
            this.tn.next();
        };

        /**
         * Parses an enum.
         * @param {!Object} msg Message definition
         * @private
         */
        ParserPrototype._parseEnum = function(msg) {
            var enm = {
                "name": "",
                "values": [],
                "options": {}
            };
            var token = this.tn.next();
            if (!Lang.NAME.test(token))
                throw Error("illegal name: "+token);
            enm["name"] = token;
            this.tn.skip("{");
            while ((token = this.tn.next()) !== '}') {
                if (token === "option")
                    this._parseOption(enm);
                else {
                    if (!Lang.NAME.test(token))
                        throw Error("illegal name: "+token);
                    this.tn.skip("=");
                    var val = {
                        "name": token,
                        "id": mkId(this.tn.next(), true)
                    };
                    token = this.tn.peek();
                    if (token === "[")
                        this._parseFieldOptions({ "options": {} });
                    this.tn.skip(";");
                    enm["values"].push(val);
                }
            }
            this.tn.omit(";");
            msg["enums"].push(enm);
        };

        /**
         * Parses extension / reserved ranges.
         * @returns {!Array.<!Array.<number>>}
         * @private
         */
        ParserPrototype._parseExtensionRanges = function() {
            var ranges = [];
            var token,
                range,
                value;
            do {
                range = [];
                while (true) {
                    token = this.tn.next();
                    switch (token) {
                        case "min":
                            value = ProtoBuf.ID_MIN;
                            break;
                        case "max":
                            value = ProtoBuf.ID_MAX;
                            break;
                        default:
                            value = mkNumber(token);
                            break;
                    }
                    range.push(value);
                    if (range.length === 2)
                        break;
                    if (this.tn.peek() !== "to") {
                        range.push(value);
                        break;
                    }
                    this.tn.next();
                }
                ranges.push(range);
            } while (this.tn.omit(","));
            this.tn.skip(";");
            return ranges;
        };

        /**
         * Parses an extend block.
         * @param {!Object} parent Parent object
         * @private
         */
        ParserPrototype._parseExtend = function(parent) {
            var token = this.tn.next();
            if (!Lang.TYPEREF.test(token))
                throw Error("illegal extend reference: "+token);
            var ext = {
                "ref": token,
                "fields": []
            };
            this.tn.skip("{");
            while ((token = this.tn.next()) !== '}') {
                if (Lang.RULE.test(token))
                    this._parseMessageField(ext, token);
                else if (Lang.TYPEREF.test(token)) {
                    if (!this.proto3)
                        throw Error("illegal field rule: "+token);
                    this._parseMessageField(ext, "optional", token);
                } else
                    throw Error("illegal extend token: "+token);
            }
            this.tn.omit(";");
            parent["messages"].push(ext);
            return ext;
        };

        // ----- General -----

        /**
         * Returns a string representation of this parser.
         * @returns {string}
         */
        ParserPrototype.toString = function() {
            return "Parser at line "+this.tn.line;
        };

        /**
         * @alias ProtoBuf.DotProto.Parser
         * @expose
         */
        DotProto.Parser = Parser;

        return DotProto;

    })(ProtoBuf, ProtoBuf.Lang);

    /**
     * @alias ProtoBuf.Reflect
     * @expose
     */
    ProtoBuf.Reflect = (function(ProtoBuf) {
        "use strict";

        /**
         * Reflection types.
         * @exports ProtoBuf.Reflect
         * @namespace
         */
        var Reflect = {};

        /**
         * Constructs a Reflect base class.
         * @exports ProtoBuf.Reflect.T
         * @constructor
         * @abstract
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {?ProtoBuf.Reflect.T} parent Parent object
         * @param {string} name Object name
         */
        var T = function(builder, parent, name) {

            /**
             * Builder reference.
             * @type {!ProtoBuf.Builder}
             * @expose
             */
            this.builder = builder;

            /**
             * Parent object.
             * @type {?ProtoBuf.Reflect.T}
             * @expose
             */
            this.parent = parent;

            /**
             * Object name in namespace.
             * @type {string}
             * @expose
             */
            this.name = name;

            /**
             * Fully qualified class name
             * @type {string}
             * @expose
             */
            this.className;
        };

        /**
         * @alias ProtoBuf.Reflect.T.prototype
         * @inner
         */
        var TPrototype = T.prototype;

        /**
         * Returns the fully qualified name of this object.
         * @returns {string} Fully qualified name as of ".PATH.TO.THIS"
         * @expose
         */
        TPrototype.fqn = function() {
            var name = this.name,
                ptr = this;
            do {
                ptr = ptr.parent;
                if (ptr == null)
                    break;
                name = ptr.name+"."+name;
            } while (true);
            return name;
        };

        /**
         * Returns a string representation of this Reflect object (its fully qualified name).
         * @param {boolean=} includeClass Set to true to include the class name. Defaults to false.
         * @return String representation
         * @expose
         */
        TPrototype.toString = function(includeClass) {
            return (includeClass ? this.className + " " : "") + this.fqn();
        };

        /**
         * Builds this type.
         * @throws {Error} If this type cannot be built directly
         * @expose
         */
        TPrototype.build = function() {
            throw Error(this.toString(true)+" cannot be built directly");
        };

        /**
         * @alias ProtoBuf.Reflect.T
         * @expose
         */
        Reflect.T = T;

        /**
         * Constructs a new Namespace.
         * @exports ProtoBuf.Reflect.Namespace
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {?ProtoBuf.Reflect.Namespace} parent Namespace parent
         * @param {string} name Namespace name
         * @param {Object.<string,*>=} options Namespace options
         * @param {string?} syntax The syntax level of this definition (e.g., proto3)
         * @constructor
         * @extends ProtoBuf.Reflect.T
         */
        var Namespace = function(builder, parent, name, options, syntax) {
            T.call(this, builder, parent, name);

            /**
             * @override
             */
            this.className = "Namespace";

            /**
             * Children inside the namespace.
             * @type {!Array.<ProtoBuf.Reflect.T>}
             */
            this.children = [];

            /**
             * Options.
             * @type {!Object.<string, *>}
             */
            this.options = options || {};

            /**
             * Syntax level (e.g., proto2 or proto3).
             * @type {!string}
             */
            this.syntax = syntax || "proto2";
        };

        /**
         * @alias ProtoBuf.Reflect.Namespace.prototype
         * @inner
         */
        var NamespacePrototype = Namespace.prototype = Object.create(T.prototype);

        /**
         * Returns an array of the namespace's children.
         * @param {ProtoBuf.Reflect.T=} type Filter type (returns instances of this type only). Defaults to null (all children).
         * @return {Array.<ProtoBuf.Reflect.T>}
         * @expose
         */
        NamespacePrototype.getChildren = function(type) {
            type = type || null;
            if (type == null)
                return this.children.slice();
            var children = [];
            for (var i=0, k=this.children.length; i<k; ++i)
                if (this.children[i] instanceof type)
                    children.push(this.children[i]);
            return children;
        };

        /**
         * Adds a child to the namespace.
         * @param {ProtoBuf.Reflect.T} child Child
         * @throws {Error} If the child cannot be added (duplicate)
         * @expose
         */
        NamespacePrototype.addChild = function(child) {
            var other;
            if (other = this.getChild(child.name)) {
                // Try to revert camelcase transformation on collision
                if (other instanceof Message.Field && other.name !== other.originalName && this.getChild(other.originalName) === null)
                    other.name = other.originalName; // Revert previous first (effectively keeps both originals)
                else if (child instanceof Message.Field && child.name !== child.originalName && this.getChild(child.originalName) === null)
                    child.name = child.originalName;
                else
                    throw Error("Duplicate name in namespace "+this.toString(true)+": "+child.name);
            }
            this.children.push(child);
        };

        /**
         * Gets a child by its name or id.
         * @param {string|number} nameOrId Child name or id
         * @return {?ProtoBuf.Reflect.T} The child or null if not found
         * @expose
         */
        NamespacePrototype.getChild = function(nameOrId) {
            var key = typeof nameOrId === 'number' ? 'id' : 'name';
            for (var i=0, k=this.children.length; i<k; ++i)
                if (this.children[i][key] === nameOrId)
                    return this.children[i];
            return null;
        };

        /**
         * Resolves a reflect object inside of this namespace.
         * @param {string|!Array.<string>} qn Qualified name to resolve
         * @param {boolean=} excludeNonNamespace Excludes non-namespace types, defaults to `false`
         * @return {?ProtoBuf.Reflect.Namespace} The resolved type or null if not found
         * @expose
         */
        NamespacePrototype.resolve = function(qn, excludeNonNamespace) {
            var part = typeof qn === 'string' ? qn.split(".") : qn,
                ptr = this,
                i = 0;
            if (part[i] === "") { // Fully qualified name, e.g. ".My.Message'
                while (ptr.parent !== null)
                    ptr = ptr.parent;
                i++;
            }
            var child;
            do {
                do {
                    if (!(ptr instanceof Reflect.Namespace)) {
                        ptr = null;
                        break;
                    }
                    child = ptr.getChild(part[i]);
                    if (!child || !(child instanceof Reflect.T) || (excludeNonNamespace && !(child instanceof Reflect.Namespace))) {
                        ptr = null;
                        break;
                    }
                    ptr = child; i++;
                } while (i < part.length);
                if (ptr != null)
                    break; // Found
                // Else search the parent
                if (this.parent !== null)
                    return this.parent.resolve(qn, excludeNonNamespace);
            } while (ptr != null);
            return ptr;
        };

        /**
         * Determines the shortest qualified name of the specified type, if any, relative to this namespace.
         * @param {!ProtoBuf.Reflect.T} t Reflection type
         * @returns {string} The shortest qualified name or, if there is none, the fqn
         * @expose
         */
        NamespacePrototype.qn = function(t) {
            var part = [], ptr = t;
            do {
                part.unshift(ptr.name);
                ptr = ptr.parent;
            } while (ptr !== null);
            for (var len=1; len <= part.length; len++) {
                var qn = part.slice(part.length-len);
                if (t === this.resolve(qn, t instanceof Reflect.Namespace))
                    return qn.join(".");
            }
            return t.fqn();
        };

        /**
         * Builds the namespace and returns the runtime counterpart.
         * @return {Object.<string,Function|Object>} Runtime namespace
         * @expose
         */
        NamespacePrototype.build = function() {
            /** @dict */
            var ns = {};
            var children = this.children;
            for (var i=0, k=children.length, child; i<k; ++i) {
                child = children[i];
                if (child instanceof Namespace)
                    ns[child.name] = child.build();
            }
            if (Object.defineProperty)
                Object.defineProperty(ns, "$options", { "value": this.buildOpt() });
            return ns;
        };

        /**
         * Builds the namespace's '$options' property.
         * @return {Object.<string,*>}
         */
        NamespacePrototype.buildOpt = function() {
            var opt = {},
                keys = Object.keys(this.options);
            for (var i=0, k=keys.length; i<k; ++i) {
                var key = keys[i],
                    val = this.options[keys[i]];
                // TODO: Options are not resolved, yet.
                // if (val instanceof Namespace) {
                //     opt[key] = val.build();
                // } else {
                opt[key] = val;
                // }
            }
            return opt;
        };

        /**
         * Gets the value assigned to the option with the specified name.
         * @param {string=} name Returns the option value if specified, otherwise all options are returned.
         * @return {*|Object.<string,*>}null} Option value or NULL if there is no such option
         */
        NamespacePrototype.getOption = function(name) {
            if (typeof name === 'undefined')
                return this.options;
            return typeof this.options[name] !== 'undefined' ? this.options[name] : null;
        };

        /**
         * @alias ProtoBuf.Reflect.Namespace
         * @expose
         */
        Reflect.Namespace = Namespace;

        /**
         * Constructs a new Element implementation that checks and converts values for a
         * particular field type, as appropriate.
         *
         * An Element represents a single value: either the value of a singular field,
         * or a value contained in one entry of a repeated field or map field. This
         * class does not implement these higher-level concepts; it only encapsulates
         * the low-level typechecking and conversion.
         *
         * @exports ProtoBuf.Reflect.Element
         * @param {{name: string, wireType: number}} type Resolved data type
         * @param {ProtoBuf.Reflect.T|null} resolvedType Resolved type, if relevant
         * (e.g. submessage field).
         * @param {boolean} isMapKey Is this element a Map key? The value will be
         * converted to string form if so.
         * @param {string} syntax Syntax level of defining message type, e.g.,
         * proto2 or proto3.
         * @constructor
         */
        var Element = function(type, resolvedType, isMapKey, syntax) {

            /**
             * Element type, as a string (e.g., int32).
             * @type {{name: string, wireType: number}}
             */
            this.type = type;

            /**
             * Element type reference to submessage or enum definition, if needed.
             * @type {ProtoBuf.Reflect.T|null}
             */
            this.resolvedType = resolvedType;

            /**
             * Element is a map key.
             * @type {boolean}
             */
            this.isMapKey = isMapKey;

            /**
             * Syntax level of defining message type, e.g., proto2 or proto3.
             * @type {string}
             */
            this.syntax = syntax;

            if (isMapKey && ProtoBuf.MAP_KEY_TYPES.indexOf(type) < 0)
                throw Error("Invalid map key type: " + type.name);
        };

        var ElementPrototype = Element.prototype;

        /**
         * Obtains a (new) default value for the specified type.
         * @param type {string|{name: string, wireType: number}} Field type
         * @returns {*} Default value
         * @inner
         */
        function mkDefault(type) {
            if (typeof type === 'string')
                type = ProtoBuf.TYPES[type];
            if (typeof type.defaultValue === 'undefined')
                throw Error("default value for type "+type.name+" is not supported");
            if (type == ProtoBuf.TYPES["bytes"])
                return new ByteBuffer(0);
            return type.defaultValue;
        }

        /**
         * Returns the default value for this field in proto3.
         * @function
         * @param type {string|{name: string, wireType: number}} the field type
         * @returns {*} Default value
         */
        Element.defaultFieldValue = mkDefault;

        /**
         * Makes a Long from a value.
         * @param {{low: number, high: number, unsigned: boolean}|string|number} value Value
         * @param {boolean=} unsigned Whether unsigned or not, defaults to reuse it from Long-like objects or to signed for
         *  strings and numbers
         * @returns {!Long}
         * @throws {Error} If the value cannot be converted to a Long
         * @inner
         */
        function mkLong(value, unsigned) {
            if (value && typeof value.low === 'number' && typeof value.high === 'number' && typeof value.unsigned === 'boolean'
                && value.low === value.low && value.high === value.high)
                return new ProtoBuf.Long(value.low, value.high, typeof unsigned === 'undefined' ? value.unsigned : unsigned);
            if (typeof value === 'string')
                return ProtoBuf.Long.fromString(value, unsigned || false, 10);
            if (typeof value === 'number')
                return ProtoBuf.Long.fromNumber(value, unsigned || false);
            throw Error("not convertible to Long");
        }

        /**
         * Checks if the given value can be set for an element of this type (singular
         * field or one element of a repeated field or map).
         * @param {*} value Value to check
         * @return {*} Verified, maybe adjusted, value
         * @throws {Error} If the value cannot be verified for this element slot
         * @expose
         */
        ElementPrototype.verifyValue = function(value) {
            var self = this;
            function fail(val, msg) {
                throw Error("Illegal value for "+self.toString(true)+" of type "+self.type.name+": "+val+" ("+msg+")");
            }
            switch (this.type) {
                // Signed 32bit
                case ProtoBuf.TYPES["int32"]:
                case ProtoBuf.TYPES["sint32"]:
                case ProtoBuf.TYPES["sfixed32"]:
                    // Account for !NaN: value === value
                    if (typeof value !== 'number' || (value === value && value % 1 !== 0))
                        fail(typeof value, "not an integer");
                    return value > 4294967295 ? value | 0 : value;

                // Unsigned 32bit
                case ProtoBuf.TYPES["uint32"]:
                case ProtoBuf.TYPES["fixed32"]:
                    if (typeof value !== 'number' || (value === value && value % 1 !== 0))
                        fail(typeof value, "not an integer");
                    return value < 0 ? value >>> 0 : value;

                // Signed 64bit
                case ProtoBuf.TYPES["int64"]:
                case ProtoBuf.TYPES["sint64"]:
                case ProtoBuf.TYPES["sfixed64"]: {
                    if (ProtoBuf.Long)
                        try {
                            return mkLong(value, false);
                        } catch (e) {
                            fail(typeof value, e.message);
                        }
                    else
                        fail(typeof value, "requires Long.js");
                }

                // Unsigned 64bit
                case ProtoBuf.TYPES["uint64"]:
                case ProtoBuf.TYPES["fixed64"]: {
                    if (ProtoBuf.Long)
                        try {
                            return mkLong(value, true);
                        } catch (e) {
                            fail(typeof value, e.message);
                        }
                    else
                        fail(typeof value, "requires Long.js");
                }

                // Bool
                case ProtoBuf.TYPES["bool"]:
                    if (typeof value !== 'boolean')
                        fail(typeof value, "not a boolean");
                    return value;

                // Float
                case ProtoBuf.TYPES["float"]:
                case ProtoBuf.TYPES["double"]:
                    if (typeof value !== 'number')
                        fail(typeof value, "not a number");
                    return value;

                // Length-delimited string
                case ProtoBuf.TYPES["string"]:
                    if (typeof value !== 'string' && !(value && value instanceof String))
                        fail(typeof value, "not a string");
                    return ""+value; // Convert String object to string

                // Length-delimited bytes
                case ProtoBuf.TYPES["bytes"]:
                    if (ByteBuffer.isByteBuffer(value))
                        return value;
                    return ByteBuffer.wrap(value, "base64");

                // Constant enum value
                case ProtoBuf.TYPES["enum"]: {
                    var values = this.resolvedType.getChildren(ProtoBuf.Reflect.Enum.Value);
                    for (i=0; i<values.length; i++)
                        if (values[i].name == value)
                            return values[i].id;
                        else if (values[i].id == value)
                            return values[i].id;

                    if (this.syntax === 'proto3') {
                        // proto3: just make sure it's an integer.
                        if (typeof value !== 'number' || (value === value && value % 1 !== 0))
                            fail(typeof value, "not an integer");
                        if (value > 4294967295 || value < 0)
                            fail(typeof value, "not in range for uint32")
                        return value;
                    } else {
                        // proto2 requires enum values to be valid.
                        fail(value, "not a valid enum value");
                    }
                }
                // Embedded message
                case ProtoBuf.TYPES["group"]:
                case ProtoBuf.TYPES["message"]: {
                    if (!value || typeof value !== 'object')
                        fail(typeof value, "object expected");
                    if (value instanceof this.resolvedType.clazz)
                        return value;
                    if (value instanceof ProtoBuf.Builder.Message) {
                        // Mismatched type: Convert to object (see: https://github.com/dcodeIO/ProtoBuf.js/issues/180)
                        var obj = {};
                        for (var i in value)
                            if (value.hasOwnProperty(i))
                                obj[i] = value[i];
                        value = obj;
                    }
                    // Else let's try to construct one from a key-value object
                    return new (this.resolvedType.clazz)(value); // May throw for a hundred of reasons
                }
            }

            // We should never end here
            throw Error("[INTERNAL] Illegal value for "+this.toString(true)+": "+value+" (undefined type "+this.type+")");
        };

        /**
         * Calculates the byte length of an element on the wire.
         * @param {number} id Field number
         * @param {*} value Field value
         * @returns {number} Byte length
         * @throws {Error} If the value cannot be calculated
         * @expose
         */
        ElementPrototype.calculateLength = function(id, value) {
            if (value === null) return 0; // Nothing to encode
            // Tag has already been written
            var n;
            switch (this.type) {
                case ProtoBuf.TYPES["int32"]:
                    return value < 0 ? ByteBuffer.calculateVarint64(value) : ByteBuffer.calculateVarint32(value);
                case ProtoBuf.TYPES["uint32"]:
                    return ByteBuffer.calculateVarint32(value);
                case ProtoBuf.TYPES["sint32"]:
                    return ByteBuffer.calculateVarint32(ByteBuffer.zigZagEncode32(value));
                case ProtoBuf.TYPES["fixed32"]:
                case ProtoBuf.TYPES["sfixed32"]:
                case ProtoBuf.TYPES["float"]:
                    return 4;
                case ProtoBuf.TYPES["int64"]:
                case ProtoBuf.TYPES["uint64"]:
                    return ByteBuffer.calculateVarint64(value);
                case ProtoBuf.TYPES["sint64"]:
                    return ByteBuffer.calculateVarint64(ByteBuffer.zigZagEncode64(value));
                case ProtoBuf.TYPES["fixed64"]:
                case ProtoBuf.TYPES["sfixed64"]:
                    return 8;
                case ProtoBuf.TYPES["bool"]:
                    return 1;
                case ProtoBuf.TYPES["enum"]:
                    return ByteBuffer.calculateVarint32(value);
                case ProtoBuf.TYPES["double"]:
                    return 8;
                case ProtoBuf.TYPES["string"]:
                    n = ByteBuffer.calculateUTF8Bytes(value);
                    return ByteBuffer.calculateVarint32(n) + n;
                case ProtoBuf.TYPES["bytes"]:
                    if (value.remaining() < 0)
                        throw Error("Illegal value for "+this.toString(true)+": "+value.remaining()+" bytes remaining");
                    return ByteBuffer.calculateVarint32(value.remaining()) + value.remaining();
                case ProtoBuf.TYPES["message"]:
                    n = this.resolvedType.calculate(value);
                    return ByteBuffer.calculateVarint32(n) + n;
                case ProtoBuf.TYPES["group"]:
                    n = this.resolvedType.calculate(value);
                    return n + ByteBuffer.calculateVarint32((id << 3) | ProtoBuf.WIRE_TYPES.ENDGROUP);
            }
            // We should never end here
            throw Error("[INTERNAL] Illegal value to encode in "+this.toString(true)+": "+value+" (unknown type)");
        };

        /**
         * Encodes a value to the specified buffer. Does not encode the key.
         * @param {number} id Field number
         * @param {*} value Field value
         * @param {ByteBuffer} buffer ByteBuffer to encode to
         * @return {ByteBuffer} The ByteBuffer for chaining
         * @throws {Error} If the value cannot be encoded
         * @expose
         */
        ElementPrototype.encodeValue = function(id, value, buffer) {
            if (value === null) return buffer; // Nothing to encode
            // Tag has already been written

            switch (this.type) {
                // 32bit signed varint
                case ProtoBuf.TYPES["int32"]:
                    // "If you use int32 or int64 as the type for a negative number, the resulting varint is always ten bytes
                    // long – it is, effectively, treated like a very large unsigned integer." (see #122)
                    if (value < 0)
                        buffer.writeVarint64(value);
                    else
                        buffer.writeVarint32(value);
                    break;

                // 32bit unsigned varint
                case ProtoBuf.TYPES["uint32"]:
                    buffer.writeVarint32(value);
                    break;

                // 32bit varint zig-zag
                case ProtoBuf.TYPES["sint32"]:
                    buffer.writeVarint32ZigZag(value);
                    break;

                // Fixed unsigned 32bit
                case ProtoBuf.TYPES["fixed32"]:
                    buffer.writeUint32(value);
                    break;

                // Fixed signed 32bit
                case ProtoBuf.TYPES["sfixed32"]:
                    buffer.writeInt32(value);
                    break;

                // 64bit varint as-is
                case ProtoBuf.TYPES["int64"]:
                case ProtoBuf.TYPES["uint64"]:
                    buffer.writeVarint64(value); // throws
                    break;

                // 64bit varint zig-zag
                case ProtoBuf.TYPES["sint64"]:
                    buffer.writeVarint64ZigZag(value); // throws
                    break;

                // Fixed unsigned 64bit
                case ProtoBuf.TYPES["fixed64"]:
                    buffer.writeUint64(value); // throws
                    break;

                // Fixed signed 64bit
                case ProtoBuf.TYPES["sfixed64"]:
                    buffer.writeInt64(value); // throws
                    break;

                // Bool
                case ProtoBuf.TYPES["bool"]:
                    if (typeof value === 'string')
                        buffer.writeVarint32(value.toLowerCase() === 'false' ? 0 : !!value);
                    else
                        buffer.writeVarint32(value ? 1 : 0);
                    break;

                // Constant enum value
                case ProtoBuf.TYPES["enum"]:
                    buffer.writeVarint32(value);
                    break;

                // 32bit float
                case ProtoBuf.TYPES["float"]:
                    buffer.writeFloat32(value);
                    break;

                // 64bit float
                case ProtoBuf.TYPES["double"]:
                    buffer.writeFloat64(value);
                    break;

                // Length-delimited string
                case ProtoBuf.TYPES["string"]:
                    buffer.writeVString(value);
                    break;

                // Length-delimited bytes
                case ProtoBuf.TYPES["bytes"]:
                    if (value.remaining() < 0)
                        throw Error("Illegal value for "+this.toString(true)+": "+value.remaining()+" bytes remaining");
                    var prevOffset = value.offset;
                    buffer.writeVarint32(value.remaining());
                    buffer.append(value);
                    value.offset = prevOffset;
                    break;

                // Embedded message
                case ProtoBuf.TYPES["message"]:
                    var bb = new ByteBuffer().LE();
                    this.resolvedType.encode(value, bb);
                    buffer.writeVarint32(bb.offset);
                    buffer.append(bb.flip());
                    break;

                // Legacy group
                case ProtoBuf.TYPES["group"]:
                    this.resolvedType.encode(value, buffer);
                    buffer.writeVarint32((id << 3) | ProtoBuf.WIRE_TYPES.ENDGROUP);
                    break;

                default:
                    // We should never end here
                    throw Error("[INTERNAL] Illegal value to encode in "+this.toString(true)+": "+value+" (unknown type)");
            }
            return buffer;
        };

        /**
         * Decode one element value from the specified buffer.
         * @param {ByteBuffer} buffer ByteBuffer to decode from
         * @param {number} wireType The field wire type
         * @param {number} id The field number
         * @return {*} Decoded value
         * @throws {Error} If the field cannot be decoded
         * @expose
         */
        ElementPrototype.decode = function(buffer, wireType, id) {
            if (wireType != this.type.wireType)
                throw Error("Unexpected wire type for element");

            var value, nBytes;
            switch (this.type) {
                // 32bit signed varint
                case ProtoBuf.TYPES["int32"]:
                    return buffer.readVarint32() | 0;

                // 32bit unsigned varint
                case ProtoBuf.TYPES["uint32"]:
                    return buffer.readVarint32() >>> 0;

                // 32bit signed varint zig-zag
                case ProtoBuf.TYPES["sint32"]:
                    return buffer.readVarint32ZigZag() | 0;

                // Fixed 32bit unsigned
                case ProtoBuf.TYPES["fixed32"]:
                    return buffer.readUint32() >>> 0;

                case ProtoBuf.TYPES["sfixed32"]:
                    return buffer.readInt32() | 0;

                // 64bit signed varint
                case ProtoBuf.TYPES["int64"]:
                    return buffer.readVarint64();

                // 64bit unsigned varint
                case ProtoBuf.TYPES["uint64"]:
                    return buffer.readVarint64().toUnsigned();

                // 64bit signed varint zig-zag
                case ProtoBuf.TYPES["sint64"]:
                    return buffer.readVarint64ZigZag();

                // Fixed 64bit unsigned
                case ProtoBuf.TYPES["fixed64"]:
                    return buffer.readUint64();

                // Fixed 64bit signed
                case ProtoBuf.TYPES["sfixed64"]:
                    return buffer.readInt64();

                // Bool varint
                case ProtoBuf.TYPES["bool"]:
                    return !!buffer.readVarint32();

                // Constant enum value (varint)
                case ProtoBuf.TYPES["enum"]:
                    // The following Builder.Message#set will already throw
                    return buffer.readVarint32();

                // 32bit float
                case ProtoBuf.TYPES["float"]:
                    return buffer.readFloat();

                // 64bit float
                case ProtoBuf.TYPES["double"]:
                    return buffer.readDouble();

                // Length-delimited string
                case ProtoBuf.TYPES["string"]:
                    return buffer.readVString();

                // Length-delimited bytes
                case ProtoBuf.TYPES["bytes"]: {
                    nBytes = buffer.readVarint32();
                    if (buffer.remaining() < nBytes)
                        throw Error("Illegal number of bytes for "+this.toString(true)+": "+nBytes+" required but got only "+buffer.remaining());
                    value = buffer.clone(); // Offset already set
                    value.limit = value.offset+nBytes;
                    buffer.offset += nBytes;
                    return value;
                }

                // Length-delimited embedded message
                case ProtoBuf.TYPES["message"]: {
                    nBytes = buffer.readVarint32();
                    return this.resolvedType.decode(buffer, nBytes);
                }

                // Legacy group
                case ProtoBuf.TYPES["group"]:
                    return this.resolvedType.decode(buffer, -1, id);
            }

            // We should never end here
            throw Error("[INTERNAL] Illegal decode type");
        };

        /**
         * Converts a value from a string to the canonical element type.
         *
         * Legal only when isMapKey is true.
         *
         * @param {string} str The string value
         * @returns {*} The value
         */
        ElementPrototype.valueFromString = function(str) {
            if (!this.isMapKey) {
                throw Error("valueFromString() called on non-map-key element");
            }

            switch (this.type) {
                case ProtoBuf.TYPES["int32"]:
                case ProtoBuf.TYPES["sint32"]:
                case ProtoBuf.TYPES["sfixed32"]:
                case ProtoBuf.TYPES["uint32"]:
                case ProtoBuf.TYPES["fixed32"]:
                    return this.verifyValue(parseInt(str));

                case ProtoBuf.TYPES["int64"]:
                case ProtoBuf.TYPES["sint64"]:
                case ProtoBuf.TYPES["sfixed64"]:
                case ProtoBuf.TYPES["uint64"]:
                case ProtoBuf.TYPES["fixed64"]:
                      // Long-based fields support conversions from string already.
                      return this.verifyValue(str);

                case ProtoBuf.TYPES["bool"]:
                      return str === "true";

                case ProtoBuf.TYPES["string"]:
                      return this.verifyValue(str);

                case ProtoBuf.TYPES["bytes"]:
                      return ByteBuffer.fromBinary(str);
            }
        };

        /**
         * Converts a value from the canonical element type to a string.
         *
         * It should be the case that `valueFromString(valueToString(val))` returns
         * a value equivalent to `verifyValue(val)` for every legal value of `val`
         * according to this element type.
         *
         * This may be used when the element must be stored or used as a string,
         * e.g., as a map key on an Object.
         *
         * Legal only when isMapKey is true.
         *
         * @param {*} val The value
         * @returns {string} The string form of the value.
         */
        ElementPrototype.valueToString = function(value) {
            if (!this.isMapKey) {
                throw Error("valueToString() called on non-map-key element");
            }

            if (this.type === ProtoBuf.TYPES["bytes"]) {
                return value.toString("binary");
            } else {
                return value.toString();
            }
        };

        /**
         * @alias ProtoBuf.Reflect.Element
         * @expose
         */
        Reflect.Element = Element;

        /**
         * Constructs a new Message.
         * @exports ProtoBuf.Reflect.Message
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Namespace} parent Parent message or namespace
         * @param {string} name Message name
         * @param {Object.<string,*>=} options Message options
         * @param {boolean=} isGroup `true` if this is a legacy group
         * @param {string?} syntax The syntax level of this definition (e.g., proto3)
         * @constructor
         * @extends ProtoBuf.Reflect.Namespace
         */
        var Message = function(builder, parent, name, options, isGroup, syntax) {
            Namespace.call(this, builder, parent, name, options, syntax);

            /**
             * @override
             */
            this.className = "Message";

            /**
             * Extensions range.
             * @type {!Array.<number>|undefined}
             * @expose
             */
            this.extensions = undefined;

            /**
             * Runtime message class.
             * @type {?function(new:ProtoBuf.Builder.Message)}
             * @expose
             */
            this.clazz = null;

            /**
             * Whether this is a legacy group or not.
             * @type {boolean}
             * @expose
             */
            this.isGroup = !!isGroup;

            // The following cached collections are used to efficiently iterate over or look up fields when decoding.

            /**
             * Cached fields.
             * @type {?Array.<!ProtoBuf.Reflect.Message.Field>}
             * @private
             */
            this._fields = null;

            /**
             * Cached fields by id.
             * @type {?Object.<number,!ProtoBuf.Reflect.Message.Field>}
             * @private
             */
            this._fieldsById = null;

            /**
             * Cached fields by name.
             * @type {?Object.<string,!ProtoBuf.Reflect.Message.Field>}
             * @private
             */
            this._fieldsByName = null;
        };

        /**
         * @alias ProtoBuf.Reflect.Message.prototype
         * @inner
         */
        var MessagePrototype = Message.prototype = Object.create(Namespace.prototype);

        /**
         * Builds the message and returns the runtime counterpart, which is a fully functional class.
         * @see ProtoBuf.Builder.Message
         * @param {boolean=} rebuild Whether to rebuild or not, defaults to false
         * @return {ProtoBuf.Reflect.Message} Message class
         * @throws {Error} If the message cannot be built
         * @expose
         */
        MessagePrototype.build = function(rebuild) {
            if (this.clazz && !rebuild)
                return this.clazz;

            // Create the runtime Message class in its own scope
            var clazz = (function(ProtoBuf, T) {

                var fields = T.getChildren(ProtoBuf.Reflect.Message.Field),
                    oneofs = T.getChildren(ProtoBuf.Reflect.Message.OneOf);

                /**
                 * Constructs a new runtime Message.
                 * @name ProtoBuf.Builder.Message
                 * @class Barebone of all runtime messages.
                 * @param {!Object.<string,*>|string} values Preset values
                 * @param {...string} var_args
                 * @constructor
                 * @throws {Error} If the message cannot be created
                 */
                var Message = function(values, var_args) {
                    ProtoBuf.Builder.Message.call(this);

                    // Create virtual oneof properties
                    for (var i=0, k=oneofs.length; i<k; ++i)
                        this[oneofs[i].name] = null;
                    // Create fields and set default values
                    for (i=0, k=fields.length; i<k; ++i) {
                        var field = fields[i];
                        this[field.name] =
                            field.repeated ? [] :
                            (field.map ? new ProtoBuf.Map(field) : null);
                        if ((field.required || T.syntax === 'proto3') &&
                            field.defaultValue !== null)
                            this[field.name] = field.defaultValue;
                    }

                    if (arguments.length > 0) {
                        var value;
                        // Set field values from a values object
                        if (arguments.length === 1 && values !== null && typeof values === 'object' &&
                            /* not _another_ Message */ (typeof values.encode !== 'function' || values instanceof Message) &&
                            /* not a repeated field */ !Array.isArray(values) &&
                            /* not a Map */ !(values instanceof ProtoBuf.Map) &&
                            /* not a ByteBuffer */ !ByteBuffer.isByteBuffer(values) &&
                            /* not an ArrayBuffer */ !(values instanceof ArrayBuffer) &&
                            /* not a Long */ !(ProtoBuf.Long && values instanceof ProtoBuf.Long)) {
                            this.$set(values);
                        } else // Set field values from arguments, in declaration order
                            for (i=0, k=arguments.length; i<k; ++i)
                                if (typeof (value = arguments[i]) !== 'undefined')
                                    this.$set(fields[i].name, value); // May throw
                    }
                };

                /**
                 * @alias ProtoBuf.Builder.Message.prototype
                 * @inner
                 */
                var MessagePrototype = Message.prototype = Object.create(ProtoBuf.Builder.Message.prototype);

                /**
                 * Adds a value to a repeated field.
                 * @name ProtoBuf.Builder.Message#add
                 * @function
                 * @param {string} key Field name
                 * @param {*} value Value to add
                 * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                 * @returns {!ProtoBuf.Builder.Message} this
                 * @throws {Error} If the value cannot be added
                 * @expose
                 */
                MessagePrototype.add = function(key, value, noAssert) {
                    var field = T._fieldsByName[key];
                    if (!noAssert) {
                        if (!field)
                            throw Error(this+"#"+key+" is undefined");
                        if (!(field instanceof ProtoBuf.Reflect.Message.Field))
                            throw Error(this+"#"+key+" is not a field: "+field.toString(true)); // May throw if it's an enum or embedded message
                        if (!field.repeated)
                            throw Error(this+"#"+key+" is not a repeated field");
                        value = field.verifyValue(value, true);
                    }
                    if (this[key] === null)
                        this[key] = [];
                    this[key].push(value);
                    return this;
                };

                /**
                 * Adds a value to a repeated field. This is an alias for {@link ProtoBuf.Builder.Message#add}.
                 * @name ProtoBuf.Builder.Message#$add
                 * @function
                 * @param {string} key Field name
                 * @param {*} value Value to add
                 * @param {boolean=} noAssert Whether to assert the value or not (asserts by default)
                 * @returns {!ProtoBuf.Builder.Message} this
                 * @throws {Error} If the value cannot be added
                 * @expose
                 */
                MessagePrototype.$add = MessagePrototype.add;

                /**
                 * Sets a field's value.
                 * @name ProtoBuf.Builder.Message#set
                 * @function
                 * @param {string|!Object.<string,*>} keyOrObj String key or plain object holding multiple values
                 * @param {(*|boolean)=} value Value to set if key is a string, otherwise omitted
                 * @param {boolean=} noAssert Whether to not assert for an actual field / proper value type, defaults to `false`
                 * @returns {!ProtoBuf.Builder.Message} this
                 * @throws {Error} If the value cannot be set
                 * @expose
                 */
                MessagePrototype.set = function(keyOrObj, value, noAssert) {
                    if (keyOrObj && typeof keyOrObj === 'object') {
                        noAssert = value;
                        for (var ikey in keyOrObj)
                            if (keyOrObj.hasOwnProperty(ikey) && typeof (value = keyOrObj[ikey]) !== 'undefined')
                                this.$set(ikey, value, noAssert);
                        return this;
                    }
                    var field = T._fieldsByName[keyOrObj];
                    if (!noAssert) {
                        if (!field)
                            throw Error(this+"#"+keyOrObj+" is not a field: undefined");
                        if (!(field instanceof ProtoBuf.Reflect.Message.Field))
                            throw Error(this+"#"+keyOrObj+" is not a field: "+field.toString(true));
                        this[field.name] = (value = field.verifyValue(value)); // May throw
                    } else
                        this[keyOrObj] = value;
                    if (field && field.oneof) { // Field is part of an OneOf (not a virtual OneOf field)
                        var currentField = this[field.oneof.name]; // Virtual field references currently set field
                        if (value !== null) {
                            if (currentField !== null && currentField !== field.name)
                                this[currentField] = null; // Clear currently set field
                            this[field.oneof.name] = field.name; // Point virtual field at this field
                        } else if (/* value === null && */currentField === keyOrObj)
                            this[field.oneof.name] = null; // Clear virtual field (current field explicitly cleared)
                    }
                    return this;
                };

                /**
                 * Sets a field's value. This is an alias for [@link ProtoBuf.Builder.Message#set}.
                 * @name ProtoBuf.Builder.Message#$set
                 * @function
                 * @param {string|!Object.<string,*>} keyOrObj String key or plain object holding multiple values
                 * @param {(*|boolean)=} value Value to set if key is a string, otherwise omitted
                 * @param {boolean=} noAssert Whether to not assert the value, defaults to `false`
                 * @throws {Error} If the value cannot be set
                 * @expose
                 */
                MessagePrototype.$set = MessagePrototype.set;

                /**
                 * Gets a field's value.
                 * @name ProtoBuf.Builder.Message#get
                 * @function
                 * @param {string} key Key
                 * @param {boolean=} noAssert Whether to not assert for an actual field, defaults to `false`
                 * @return {*} Value
                 * @throws {Error} If there is no such field
                 * @expose
                 */
                MessagePrototype.get = function(key, noAssert) {
                    if (noAssert)
                        return this[key];
                    var field = T._fieldsByName[key];
                    if (!field || !(field instanceof ProtoBuf.Reflect.Message.Field))
                        throw Error(this+"#"+key+" is not a field: undefined");
                    if (!(field instanceof ProtoBuf.Reflect.Message.Field))
                        throw Error(this+"#"+key+" is not a field: "+field.toString(true));
                    return this[field.name];
                };

                /**
                 * Gets a field's value. This is an alias for {@link ProtoBuf.Builder.Message#$get}.
                 * @name ProtoBuf.Builder.Message#$get
                 * @function
                 * @param {string} key Key
                 * @return {*} Value
                 * @throws {Error} If there is no such field
                 * @expose
                 */
                MessagePrototype.$get = MessagePrototype.get;

                // Getters and setters

                for (var i=0; i<fields.length; i++) {
                    var field = fields[i];
                    // no setters for extension fields as these are named by their fqn
                    if (field instanceof ProtoBuf.Reflect.Message.ExtensionField)
                        continue;

                    if (T.builder.options['populateAccessors'])
                        (function(field) {
                            // set/get[SomeValue]
                            var Name = field.originalName.replace(/(_[a-zA-Z])/g, function(match) {
                                return match.toUpperCase().replace('_','');
                            });
                            Name = Name.substring(0,1).toUpperCase() + Name.substring(1);

                            // set/get_[some_value] FIXME: Do we really need these?
                            var name = field.originalName.replace(/([A-Z])/g, function(match) {
                                return "_"+match;
                            });

                            /**
                             * The current field's unbound setter function.
                             * @function
                             * @param {*} value
                             * @param {boolean=} noAssert
                             * @returns {!ProtoBuf.Builder.Message}
                             * @inner
                             */
                            var setter = function(value, noAssert) {
                                this[field.name] = noAssert ? value : field.verifyValue(value);
                                return this;
                            };

                            /**
                             * The current field's unbound getter function.
                             * @function
                             * @returns {*}
                             * @inner
                             */
                            var getter = function() {
                                return this[field.name];
                            };

                            if (T.getChild("set"+Name) === null)
                                /**
                                 * Sets a value. This method is present for each field, but only if there is no name conflict with
                                 *  another field.
                                 * @name ProtoBuf.Builder.Message#set[SomeField]
                                 * @function
                                 * @param {*} value Value to set
                                 * @param {boolean=} noAssert Whether to not assert the value, defaults to `false`
                                 * @returns {!ProtoBuf.Builder.Message} this
                                 * @abstract
                                 * @throws {Error} If the value cannot be set
                                 */
                                MessagePrototype["set"+Name] = setter;

                            if (T.getChild("set_"+name) === null)
                                /**
                                 * Sets a value. This method is present for each field, but only if there is no name conflict with
                                 *  another field.
                                 * @name ProtoBuf.Builder.Message#set_[some_field]
                                 * @function
                                 * @param {*} value Value to set
                                 * @param {boolean=} noAssert Whether to not assert the value, defaults to `false`
                                 * @returns {!ProtoBuf.Builder.Message} this
                                 * @abstract
                                 * @throws {Error} If the value cannot be set
                                 */
                                MessagePrototype["set_"+name] = setter;

                            if (T.getChild("get"+Name) === null)
                                /**
                                 * Gets a value. This method is present for each field, but only if there is no name conflict with
                                 *  another field.
                                 * @name ProtoBuf.Builder.Message#get[SomeField]
                                 * @function
                                 * @abstract
                                 * @return {*} The value
                                 */
                                MessagePrototype["get"+Name] = getter;

                            if (T.getChild("get_"+name) === null)
                                /**
                                 * Gets a value. This method is present for each field, but only if there is no name conflict with
                                 *  another field.
                                 * @name ProtoBuf.Builder.Message#get_[some_field]
                                 * @function
                                 * @return {*} The value
                                 * @abstract
                                 */
                                MessagePrototype["get_"+name] = getter;

                        })(field);
                }

                // En-/decoding

                /**
                 * Encodes the message.
                 * @name ProtoBuf.Builder.Message#$encode
                 * @function
                 * @param {(!ByteBuffer|boolean)=} buffer ByteBuffer to encode to. Will create a new one and flip it if omitted.
                 * @param {boolean=} noVerify Whether to not verify field values, defaults to `false`
                 * @return {!ByteBuffer} Encoded message as a ByteBuffer
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded ByteBuffer in the `encoded` property on the error.
                 * @expose
                 * @see ProtoBuf.Builder.Message#encode64
                 * @see ProtoBuf.Builder.Message#encodeHex
                 * @see ProtoBuf.Builder.Message#encodeAB
                 */
                MessagePrototype.encode = function(buffer, noVerify) {
                    if (typeof buffer === 'boolean')
                        noVerify = buffer,
                        buffer = undefined;
                    var isNew = false;
                    if (!buffer)
                        buffer = new ByteBuffer(),
                        isNew = true;
                    var le = buffer.littleEndian;
                    try {
                        T.encode(this, buffer.LE(), noVerify);
                        return (isNew ? buffer.flip() : buffer).LE(le);
                    } catch (e) {
                        buffer.LE(le);
                        throw(e);
                    }
                };

                /**
                 * Encodes a message using the specified data payload.
                 * @param {!Object.<string,*>} data Data payload
                 * @param {(!ByteBuffer|boolean)=} buffer ByteBuffer to encode to. Will create a new one and flip it if omitted.
                 * @param {boolean=} noVerify Whether to not verify field values, defaults to `false`
                 * @return {!ByteBuffer} Encoded message as a ByteBuffer
                 * @expose
                 */
                Message.encode = function(data, buffer, noVerify) {
                    return new Message(data).encode(buffer, noVerify);
                };

                /**
                 * Calculates the byte length of the message.
                 * @name ProtoBuf.Builder.Message#calculate
                 * @function
                 * @returns {number} Byte length
                 * @throws {Error} If the message cannot be calculated or if required fields are missing.
                 * @expose
                 */
                MessagePrototype.calculate = function() {
                    return T.calculate(this);
                };

                /**
                 * Encodes the varint32 length-delimited message.
                 * @name ProtoBuf.Builder.Message#encodeDelimited
                 * @function
                 * @param {(!ByteBuffer|boolean)=} buffer ByteBuffer to encode to. Will create a new one and flip it if omitted.
                 * @param {boolean=} noVerify Whether to not verify field values, defaults to `false`
                 * @return {!ByteBuffer} Encoded message as a ByteBuffer
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded ByteBuffer in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.encodeDelimited = function(buffer, noVerify) {
                    var isNew = false;
                    if (!buffer)
                        buffer = new ByteBuffer(),
                        isNew = true;
                    var enc = new ByteBuffer().LE();
                    T.encode(this, enc, noVerify).flip();
                    buffer.writeVarint32(enc.remaining());
                    buffer.append(enc);
                    return isNew ? buffer.flip() : buffer;
                };

                /**
                 * Directly encodes the message to an ArrayBuffer.
                 * @name ProtoBuf.Builder.Message#encodeAB
                 * @function
                 * @return {ArrayBuffer} Encoded message as ArrayBuffer
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded ArrayBuffer in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.encodeAB = function() {
                    try {
                        return this.encode().toArrayBuffer();
                    } catch (e) {
                        if (e["encoded"]) e["encoded"] = e["encoded"].toArrayBuffer();
                        throw(e);
                    }
                };

                /**
                 * Returns the message as an ArrayBuffer. This is an alias for {@link ProtoBuf.Builder.Message#encodeAB}.
                 * @name ProtoBuf.Builder.Message#toArrayBuffer
                 * @function
                 * @return {ArrayBuffer} Encoded message as ArrayBuffer
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded ArrayBuffer in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.toArrayBuffer = MessagePrototype.encodeAB;

                /**
                 * Directly encodes the message to a node Buffer.
                 * @name ProtoBuf.Builder.Message#encodeNB
                 * @function
                 * @return {!Buffer}
                 * @throws {Error} If the message cannot be encoded, not running under node.js or if required fields are
                 *  missing. The later still returns the encoded node Buffer in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.encodeNB = function() {
                    try {
                        return this.encode().toBuffer();
                    } catch (e) {
                        if (e["encoded"]) e["encoded"] = e["encoded"].toBuffer();
                        throw(e);
                    }
                };

                /**
                 * Returns the message as a node Buffer. This is an alias for {@link ProtoBuf.Builder.Message#encodeNB}.
                 * @name ProtoBuf.Builder.Message#toBuffer
                 * @function
                 * @return {!Buffer}
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded node Buffer in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.toBuffer = MessagePrototype.encodeNB;

                /**
                 * Directly encodes the message to a base64 encoded string.
                 * @name ProtoBuf.Builder.Message#encode64
                 * @function
                 * @return {string} Base64 encoded string
                 * @throws {Error} If the underlying buffer cannot be encoded or if required fields are missing. The later
                 *  still returns the encoded base64 string in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.encode64 = function() {
                    try {
                        return this.encode().toBase64();
                    } catch (e) {
                        if (e["encoded"]) e["encoded"] = e["encoded"].toBase64();
                        throw(e);
                    }
                };

                /**
                 * Returns the message as a base64 encoded string. This is an alias for {@link ProtoBuf.Builder.Message#encode64}.
                 * @name ProtoBuf.Builder.Message#toBase64
                 * @function
                 * @return {string} Base64 encoded string
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded base64 string in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.toBase64 = MessagePrototype.encode64;

                /**
                 * Directly encodes the message to a hex encoded string.
                 * @name ProtoBuf.Builder.Message#encodeHex
                 * @function
                 * @return {string} Hex encoded string
                 * @throws {Error} If the underlying buffer cannot be encoded or if required fields are missing. The later
                 *  still returns the encoded hex string in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.encodeHex = function() {
                    try {
                        return this.encode().toHex();
                    } catch (e) {
                        if (e["encoded"]) e["encoded"] = e["encoded"].toHex();
                        throw(e);
                    }
                };

                /**
                 * Returns the message as a hex encoded string. This is an alias for {@link ProtoBuf.Builder.Message#encodeHex}.
                 * @name ProtoBuf.Builder.Message#toHex
                 * @function
                 * @return {string} Hex encoded string
                 * @throws {Error} If the message cannot be encoded or if required fields are missing. The later still
                 *  returns the encoded hex string in the `encoded` property on the error.
                 * @expose
                 */
                MessagePrototype.toHex = MessagePrototype.encodeHex;

                /**
                 * Clones a message object or field value to a raw object.
                 * @param {*} obj Object to clone
                 * @param {boolean} binaryAsBase64 Whether to include binary data as base64 strings or as a buffer otherwise
                 * @param {boolean} longsAsStrings Whether to encode longs as strings
                 * @param {!ProtoBuf.Reflect.T=} resolvedType The resolved field type if a field
                 * @returns {*} Cloned object
                 * @inner
                 */
                function cloneRaw(obj, binaryAsBase64, longsAsStrings, resolvedType) {
                    if (obj === null || typeof obj !== 'object') {
                        // Convert enum values to their respective names
                        if (resolvedType && resolvedType instanceof ProtoBuf.Reflect.Enum) {
                            var name = ProtoBuf.Reflect.Enum.getName(resolvedType.object, obj);
                            if (name !== null)
                                return name;
                        }
                        // Pass-through string, number, boolean, null...
                        return obj;
                    }
                    // Convert ByteBuffers to raw buffer or strings
                    if (ByteBuffer.isByteBuffer(obj))
                        return binaryAsBase64 ? obj.toBase64() : obj.toBuffer();
                    // Convert Longs to proper objects or strings
                    if (ProtoBuf.Long.isLong(obj))
                        return longsAsStrings ? obj.toString() : ProtoBuf.Long.fromValue(obj);
                    var clone;
                    // Clone arrays
                    if (Array.isArray(obj)) {
                        clone = [];
                        obj.forEach(function(v, k) {
                            clone[k] = cloneRaw(v, binaryAsBase64, longsAsStrings, resolvedType);
                        });
                        return clone;
                    }
                    clone = {};
                    // Convert maps to objects
                    if (obj instanceof ProtoBuf.Map) {
                        var it = obj.entries();
                        for (var e = it.next(); !e.done; e = it.next())
                            clone[obj.keyElem.valueToString(e.value[0])] = cloneRaw(e.value[1], binaryAsBase64, longsAsStrings, obj.valueElem.resolvedType);
                        return clone;
                    }
                    // Everything else is a non-null object
                    var type = obj.$type,
                        field = undefined;
                    for (var i in obj)
                        if (obj.hasOwnProperty(i)) {
                            if (type && (field = type.getChild(i)))
                                clone[i] = cloneRaw(obj[i], binaryAsBase64, longsAsStrings, field.resolvedType);
                            else
                                clone[i] = cloneRaw(obj[i], binaryAsBase64, longsAsStrings);
                        }
                    return clone;
                }

                /**
                 * Returns the message's raw payload.
                 * @param {boolean=} binaryAsBase64 Whether to include binary data as base64 strings instead of Buffers, defaults to `false`
                 * @param {boolean} longsAsStrings Whether to encode longs as strings
                 * @returns {Object.<string,*>} Raw payload
                 * @expose
                 */
                MessagePrototype.toRaw = function(binaryAsBase64, longsAsStrings) {
                    return cloneRaw(this, !!binaryAsBase64, !!longsAsStrings, this.$type);
                };

                /**
                 * Encodes a message to JSON.
                 * @returns {string} JSON string
                 * @expose
                 */
                MessagePrototype.encodeJSON = function() {
                    return JSON.stringify(
                        cloneRaw(this,
                             /* binary-as-base64 */ true,
                             /* longs-as-strings */ true,
                             this.$type
                        )
                    );
                };

                /**
                 * Decodes a message from the specified buffer or string.
                 * @name ProtoBuf.Builder.Message.decode
                 * @function
                 * @param {!ByteBuffer|!ArrayBuffer|!Buffer|string} buffer Buffer to decode from
                 * @param {(number|string)=} length Message length. Defaults to decode all the remainig data.
                 * @param {string=} enc Encoding if buffer is a string: hex, utf8 (not recommended), defaults to base64
                 * @return {!ProtoBuf.Builder.Message} Decoded message
                 * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                 *  returns the decoded message with missing fields in the `decoded` property on the error.
                 * @expose
                 * @see ProtoBuf.Builder.Message.decode64
                 * @see ProtoBuf.Builder.Message.decodeHex
                 */
                Message.decode = function(buffer, length, enc) {
                    if (typeof length === 'string')
                        enc = length,
                        length = -1;
                    if (typeof buffer === 'string')
                        buffer = ByteBuffer.wrap(buffer, enc ? enc : "base64");
                    buffer = ByteBuffer.isByteBuffer(buffer) ? buffer : ByteBuffer.wrap(buffer); // May throw
                    var le = buffer.littleEndian;
                    try {
                        var msg = T.decode(buffer.LE());
                        buffer.LE(le);
                        return msg;
                    } catch (e) {
                        buffer.LE(le);
                        throw(e);
                    }
                };

                /**
                 * Decodes a varint32 length-delimited message from the specified buffer or string.
                 * @name ProtoBuf.Builder.Message.decodeDelimited
                 * @function
                 * @param {!ByteBuffer|!ArrayBuffer|!Buffer|string} buffer Buffer to decode from
                 * @param {string=} enc Encoding if buffer is a string: hex, utf8 (not recommended), defaults to base64
                 * @return {ProtoBuf.Builder.Message} Decoded message or `null` if not enough bytes are available yet
                 * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                 *  returns the decoded message with missing fields in the `decoded` property on the error.
                 * @expose
                 */
                Message.decodeDelimited = function(buffer, enc) {
                    if (typeof buffer === 'string')
                        buffer = ByteBuffer.wrap(buffer, enc ? enc : "base64");
                    buffer = ByteBuffer.isByteBuffer(buffer) ? buffer : ByteBuffer.wrap(buffer); // May throw
                    if (buffer.remaining() < 1)
                        return null;
                    var off = buffer.offset,
                        len = buffer.readVarint32();
                    if (buffer.remaining() < len) {
                        buffer.offset = off;
                        return null;
                    }
                    try {
                        var msg = T.decode(buffer.slice(buffer.offset, buffer.offset + len).LE());
                        buffer.offset += len;
                        return msg;
                    } catch (err) {
                        buffer.offset += len;
                        throw err;
                    }
                };

                /**
                 * Decodes the message from the specified base64 encoded string.
                 * @name ProtoBuf.Builder.Message.decode64
                 * @function
                 * @param {string} str String to decode from
                 * @return {!ProtoBuf.Builder.Message} Decoded message
                 * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                 *  returns the decoded message with missing fields in the `decoded` property on the error.
                 * @expose
                 */
                Message.decode64 = function(str) {
                    return Message.decode(str, "base64");
                };

                /**
                 * Decodes the message from the specified hex encoded string.
                 * @name ProtoBuf.Builder.Message.decodeHex
                 * @function
                 * @param {string} str String to decode from
                 * @return {!ProtoBuf.Builder.Message} Decoded message
                 * @throws {Error} If the message cannot be decoded or if required fields are missing. The later still
                 *  returns the decoded message with missing fields in the `decoded` property on the error.
                 * @expose
                 */
                Message.decodeHex = function(str) {
                    return Message.decode(str, "hex");
                };

                /**
                 * Decodes the message from a JSON string.
                 * @name ProtoBuf.Builder.Message.decodeJSON
                 * @function
                 * @param {string} str String to decode from
                 * @return {!ProtoBuf.Builder.Message} Decoded message
                 * @throws {Error} If the message cannot be decoded or if required fields are
                 * missing.
                 * @expose
                 */
                Message.decodeJSON = function(str) {
                    return new Message(JSON.parse(str));
                };

                // Utility

                /**
                 * Returns a string representation of this Message.
                 * @name ProtoBuf.Builder.Message#toString
                 * @function
                 * @return {string} String representation as of ".Fully.Qualified.MessageName"
                 * @expose
                 */
                MessagePrototype.toString = function() {
                    return T.toString();
                };

                // Properties

                /**
                 * Message options.
                 * @name ProtoBuf.Builder.Message.$options
                 * @type {Object.<string,*>}
                 * @expose
                 */
                var $optionsS; // cc needs this

                /**
                 * Message options.
                 * @name ProtoBuf.Builder.Message#$options
                 * @type {Object.<string,*>}
                 * @expose
                 */
                var $options;

                /**
                 * Reflection type.
                 * @name ProtoBuf.Builder.Message.$type
                 * @type {!ProtoBuf.Reflect.Message}
                 * @expose
                 */
                var $typeS;

                /**
                 * Reflection type.
                 * @name ProtoBuf.Builder.Message#$type
                 * @type {!ProtoBuf.Reflect.Message}
                 * @expose
                 */
                var $type;

                if (Object.defineProperty)
                    Object.defineProperty(Message, '$options', { "value": T.buildOpt() }),
                    Object.defineProperty(MessagePrototype, "$options", { "value": Message["$options"] }),
                    Object.defineProperty(Message, "$type", { "value": T }),
                    Object.defineProperty(MessagePrototype, "$type", { "value": T });

                return Message;

            })(ProtoBuf, this);

            // Static enums and prototyped sub-messages / cached collections
            this._fields = [];
            this._fieldsById = {};
            this._fieldsByName = {};
            for (var i=0, k=this.children.length, child; i<k; i++) {
                child = this.children[i];
                if (child instanceof Enum || child instanceof Message || child instanceof Service) {
                    if (clazz.hasOwnProperty(child.name))
                        throw Error("Illegal reflect child of "+this.toString(true)+": "+child.toString(true)+" cannot override static property '"+child.name+"'");
                    clazz[child.name] = child.build();
                } else if (child instanceof Message.Field)
                    child.build(),
                    this._fields.push(child),
                    this._fieldsById[child.id] = child,
                    this._fieldsByName[child.name] = child;
                else if (!(child instanceof Message.OneOf) && !(child instanceof Extension)) // Not built
                    throw Error("Illegal reflect child of "+this.toString(true)+": "+this.children[i].toString(true));
            }

            return this.clazz = clazz;
        };

        /**
         * Encodes a runtime message's contents to the specified buffer.
         * @param {!ProtoBuf.Builder.Message} message Runtime message to encode
         * @param {ByteBuffer} buffer ByteBuffer to write to
         * @param {boolean=} noVerify Whether to not verify field values, defaults to `false`
         * @return {ByteBuffer} The ByteBuffer for chaining
         * @throws {Error} If required fields are missing or the message cannot be encoded for another reason
         * @expose
         */
        MessagePrototype.encode = function(message, buffer, noVerify) {
            var fieldMissing = null,
                field;
            for (var i=0, k=this._fields.length, val; i<k; ++i) {
                field = this._fields[i];
                val = message[field.name];
                if (field.required && val === null) {
                    if (fieldMissing === null)
                        fieldMissing = field;
                } else
                    field.encode(noVerify ? val : field.verifyValue(val), buffer, message);
            }
            if (fieldMissing !== null) {
                var err = Error("Missing at least one required field for "+this.toString(true)+": "+fieldMissing);
                err["encoded"] = buffer; // Still expose what we got
                throw(err);
            }
            return buffer;
        };

        /**
         * Calculates a runtime message's byte length.
         * @param {!ProtoBuf.Builder.Message} message Runtime message to encode
         * @returns {number} Byte length
         * @throws {Error} If required fields are missing or the message cannot be calculated for another reason
         * @expose
         */
        MessagePrototype.calculate = function(message) {
            for (var n=0, i=0, k=this._fields.length, field, val; i<k; ++i) {
                field = this._fields[i];
                val = message[field.name];
                if (field.required && val === null)
                   throw Error("Missing at least one required field for "+this.toString(true)+": "+field);
                else
                    n += field.calculate(val, message);
            }
            return n;
        };

        /**
         * Skips all data until the end of the specified group has been reached.
         * @param {number} expectedId Expected GROUPEND id
         * @param {!ByteBuffer} buf ByteBuffer
         * @returns {boolean} `true` if a value as been skipped, `false` if the end has been reached
         * @throws {Error} If it wasn't possible to find the end of the group (buffer overrun or end tag mismatch)
         * @inner
         */
        function skipTillGroupEnd(expectedId, buf) {
            var tag = buf.readVarint32(), // Throws on OOB
                wireType = tag & 0x07,
                id = tag >>> 3;
            switch (wireType) {
                case ProtoBuf.WIRE_TYPES.VARINT:
                    do tag = buf.readUint8();
                    while ((tag & 0x80) === 0x80);
                    break;
                case ProtoBuf.WIRE_TYPES.BITS64:
                    buf.offset += 8;
                    break;
                case ProtoBuf.WIRE_TYPES.LDELIM:
                    tag = buf.readVarint32(); // reads the varint
                    buf.offset += tag;        // skips n bytes
                    break;
                case ProtoBuf.WIRE_TYPES.STARTGROUP:
                    skipTillGroupEnd(id, buf);
                    break;
                case ProtoBuf.WIRE_TYPES.ENDGROUP:
                    if (id === expectedId)
                        return false;
                    else
                        throw Error("Illegal GROUPEND after unknown group: "+id+" ("+expectedId+" expected)");
                case ProtoBuf.WIRE_TYPES.BITS32:
                    buf.offset += 4;
                    break;
                default:
                    throw Error("Illegal wire type in unknown group "+expectedId+": "+wireType);
            }
            return true;
        }

        /**
         * Decodes an encoded message and returns the decoded message.
         * @param {ByteBuffer} buffer ByteBuffer to decode from
         * @param {number=} length Message length. Defaults to decode all remaining data.
         * @param {number=} expectedGroupEndId Expected GROUPEND id if this is a legacy group
         * @return {ProtoBuf.Builder.Message} Decoded message
         * @throws {Error} If the message cannot be decoded
         * @expose
         */
        MessagePrototype.decode = function(buffer, length, expectedGroupEndId) {
            length = typeof length === 'number' ? length : -1;
            var start = buffer.offset,
                msg = new (this.clazz)(),
                tag, wireType, id, field;
            while (buffer.offset < start+length || (length === -1 && buffer.remaining() > 0)) {
                tag = buffer.readVarint32();
                wireType = tag & 0x07;
                id = tag >>> 3;
                if (wireType === ProtoBuf.WIRE_TYPES.ENDGROUP) {
                    if (id !== expectedGroupEndId)
                        throw Error("Illegal group end indicator for "+this.toString(true)+": "+id+" ("+(expectedGroupEndId ? expectedGroupEndId+" expected" : "not a group")+")");
                    break;
                }
                if (!(field = this._fieldsById[id])) {
                    // "messages created by your new code can be parsed by your old code: old binaries simply ignore the new field when parsing."
                    switch (wireType) {
                        case ProtoBuf.WIRE_TYPES.VARINT:
                            buffer.readVarint32();
                            break;
                        case ProtoBuf.WIRE_TYPES.BITS32:
                            buffer.offset += 4;
                            break;
                        case ProtoBuf.WIRE_TYPES.BITS64:
                            buffer.offset += 8;
                            break;
                        case ProtoBuf.WIRE_TYPES.LDELIM:
                            var len = buffer.readVarint32();
                            buffer.offset += len;
                            break;
                        case ProtoBuf.WIRE_TYPES.STARTGROUP:
                            while (skipTillGroupEnd(id, buffer)) {}
                            break;
                        default:
                            throw Error("Illegal wire type for unknown field "+id+" in "+this.toString(true)+"#decode: "+wireType);
                    }
                    continue;
                }
                if (field.repeated && !field.options["packed"]) {
                    msg[field.name].push(field.decode(wireType, buffer));
                } else if (field.map) {
                    var keyval = field.decode(wireType, buffer);
                    msg[field.name].set(keyval[0], keyval[1]);
                } else {
                    msg[field.name] = field.decode(wireType, buffer);
                    if (field.oneof) { // Field is part of an OneOf (not a virtual OneOf field)
                        var currentField = msg[field.oneof.name]; // Virtual field references currently set field
                        if (currentField !== null && currentField !== field.name)
                            msg[currentField] = null; // Clear currently set field
                        msg[field.oneof.name] = field.name; // Point virtual field at this field
                    }
                }
            }

            // Check if all required fields are present and set default values for optional fields that are not
            for (var i=0, k=this._fields.length; i<k; ++i) {
                field = this._fields[i];
                if (msg[field.name] === null) {
                    if (this.syntax === "proto3") { // Proto3 sets default values by specification
                        msg[field.name] = field.defaultValue;
                    } else if (field.required) {
                        var err = Error("Missing at least one required field for " + this.toString(true) + ": " + field.name);
                        err["decoded"] = msg; // Still expose what we got
                        throw(err);
                    } else if (ProtoBuf.populateDefaults && field.defaultValue !== null)
                        msg[field.name] = field.defaultValue;
                }
            }
            return msg;
        };

        /**
         * @alias ProtoBuf.Reflect.Message
         * @expose
         */
        Reflect.Message = Message;

        /**
         * Constructs a new Message Field.
         * @exports ProtoBuf.Reflect.Message.Field
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Message} message Message reference
         * @param {string} rule Rule, one of requried, optional, repeated
         * @param {string?} keytype Key data type, if any.
         * @param {string} type Data type, e.g. int32
         * @param {string} name Field name
         * @param {number} id Unique field id
         * @param {Object.<string,*>=} options Options
         * @param {!ProtoBuf.Reflect.Message.OneOf=} oneof Enclosing OneOf
         * @param {string?} syntax The syntax level of this definition (e.g., proto3)
         * @constructor
         * @extends ProtoBuf.Reflect.T
         */
        var Field = function(builder, message, rule, keytype, type, name, id, options, oneof, syntax) {
            T.call(this, builder, message, name);

            /**
             * @override
             */
            this.className = "Message.Field";

            /**
             * Message field required flag.
             * @type {boolean}
             * @expose
             */
            this.required = rule === "required";

            /**
             * Message field repeated flag.
             * @type {boolean}
             * @expose
             */
            this.repeated = rule === "repeated";

            /**
             * Message field map flag.
             * @type {boolean}
             * @expose
             */
            this.map = rule === "map";

            /**
             * Message field key type. Type reference string if unresolved, protobuf
             * type if resolved. Valid only if this.map === true, null otherwise.
             * @type {string|{name: string, wireType: number}|null}
             * @expose
             */
            this.keyType = keytype || null;

            /**
             * Message field type. Type reference string if unresolved, protobuf type if
             * resolved. In a map field, this is the value type.
             * @type {string|{name: string, wireType: number}}
             * @expose
             */
            this.type = type;

            /**
             * Resolved type reference inside the global namespace.
             * @type {ProtoBuf.Reflect.T|null}
             * @expose
             */
            this.resolvedType = null;

            /**
             * Unique message field id.
             * @type {number}
             * @expose
             */
            this.id = id;

            /**
             * Message field options.
             * @type {!Object.<string,*>}
             * @dict
             * @expose
             */
            this.options = options || {};

            /**
             * Default value.
             * @type {*}
             * @expose
             */
            this.defaultValue = null;

            /**
             * Enclosing OneOf.
             * @type {?ProtoBuf.Reflect.Message.OneOf}
             * @expose
             */
            this.oneof = oneof || null;

            /**
             * Syntax level of this definition (e.g., proto3).
             * @type {string}
             * @expose
             */
            this.syntax = syntax || 'proto2';

            /**
             * Original field name.
             * @type {string}
             * @expose
             */
            this.originalName = this.name; // Used to revert camelcase transformation on naming collisions

            /**
             * Element implementation. Created in build() after types are resolved.
             * @type {ProtoBuf.Element}
             * @expose
             */
            this.element = null;

            /**
             * Key element implementation, for map fields. Created in build() after
             * types are resolved.
             * @type {ProtoBuf.Element}
             * @expose
             */
            this.keyElement = null;

            // Convert field names to camel case notation if the override is set
            if (this.builder.options['convertFieldsToCamelCase'] && !(this instanceof Message.ExtensionField))
                this.name = ProtoBuf.Util.toCamelCase(this.name);
        };

        /**
         * @alias ProtoBuf.Reflect.Message.Field.prototype
         * @inner
         */
        var FieldPrototype = Field.prototype = Object.create(T.prototype);

        /**
         * Builds the field.
         * @override
         * @expose
         */
        FieldPrototype.build = function() {
            this.element = new Element(this.type, this.resolvedType, false, this.syntax);
            if (this.map)
                this.keyElement = new Element(this.keyType, undefined, true, this.syntax);

            // In proto3, fields do not have field presence, and every field is set to
            // its type's default value ("", 0, 0.0, or false).
            if (this.syntax === 'proto3' && !this.repeated && !this.map)
                this.defaultValue = Element.defaultFieldValue(this.type);

            // Otherwise, default values are present when explicitly specified
            else if (typeof this.options['default'] !== 'undefined')
                this.defaultValue = this.verifyValue(this.options['default']);
        };

        /**
         * Checks if the given value can be set for this field.
         * @param {*} value Value to check
         * @param {boolean=} skipRepeated Whether to skip the repeated value check or not. Defaults to false.
         * @return {*} Verified, maybe adjusted, value
         * @throws {Error} If the value cannot be set for this field
         * @expose
         */
        FieldPrototype.verifyValue = function(value, skipRepeated) {
            skipRepeated = skipRepeated || false;
            var self = this;
            function fail(val, msg) {
                throw Error("Illegal value for "+self.toString(true)+" of type "+self.type.name+": "+val+" ("+msg+")");
            }
            if (value === null) { // NULL values for optional fields
                if (this.required)
                    fail(typeof value, "required");
                if (this.syntax === 'proto3' && this.type !== ProtoBuf.TYPES["message"])
                    fail(typeof value, "proto3 field without field presence cannot be null");
                return null;
            }
            var i;
            if (this.repeated && !skipRepeated) { // Repeated values as arrays
                if (!Array.isArray(value))
                    value = [value];
                var res = [];
                for (i=0; i<value.length; i++)
                    res.push(this.element.verifyValue(value[i]));
                return res;
            }
            if (this.map && !skipRepeated) { // Map values as objects
                if (!(value instanceof ProtoBuf.Map)) {
                    // If not already a Map, attempt to convert.
                    if (!(value instanceof Object)) {
                        fail(typeof value,
                             "expected ProtoBuf.Map or raw object for map field");
                    }
                    return new ProtoBuf.Map(this, value);
                } else {
                    return value;
                }
            }
            // All non-repeated fields expect no array
            if (!this.repeated && Array.isArray(value))
                fail(typeof value, "no array expected");

            return this.element.verifyValue(value);
        };

        /**
         * Determines whether the field will have a presence on the wire given its
         * value.
         * @param {*} value Verified field value
         * @param {!ProtoBuf.Builder.Message} message Runtime message
         * @return {boolean} Whether the field will be present on the wire
         */
        FieldPrototype.hasWirePresence = function(value, message) {
            if (this.syntax !== 'proto3')
                return (value !== null);
            if (this.oneof && message[this.oneof.name] === this.name)
                return true;
            switch (this.type) {
                case ProtoBuf.TYPES["int32"]:
                case ProtoBuf.TYPES["sint32"]:
                case ProtoBuf.TYPES["sfixed32"]:
                case ProtoBuf.TYPES["uint32"]:
                case ProtoBuf.TYPES["fixed32"]:
                    return value !== 0;

                case ProtoBuf.TYPES["int64"]:
                case ProtoBuf.TYPES["sint64"]:
                case ProtoBuf.TYPES["sfixed64"]:
                case ProtoBuf.TYPES["uint64"]:
                case ProtoBuf.TYPES["fixed64"]:
                    return value.low !== 0 || value.high !== 0;

                case ProtoBuf.TYPES["bool"]:
                    return value;

                case ProtoBuf.TYPES["float"]:
                case ProtoBuf.TYPES["double"]:
                    return value !== 0.0;

                case ProtoBuf.TYPES["string"]:
                    return value.length > 0;

                case ProtoBuf.TYPES["bytes"]:
                    return value.remaining() > 0;

                case ProtoBuf.TYPES["enum"]:
                    return value !== 0;

                case ProtoBuf.TYPES["message"]:
                    return value !== null;
                default:
                    return true;
            }
        };

        /**
         * Encodes the specified field value to the specified buffer.
         * @param {*} value Verified field value
         * @param {ByteBuffer} buffer ByteBuffer to encode to
         * @param {!ProtoBuf.Builder.Message} message Runtime message
         * @return {ByteBuffer} The ByteBuffer for chaining
         * @throws {Error} If the field cannot be encoded
         * @expose
         */
        FieldPrototype.encode = function(value, buffer, message) {
            if (this.type === null || typeof this.type !== 'object')
                throw Error("[INTERNAL] Unresolved type in "+this.toString(true)+": "+this.type);
            if (value === null || (this.repeated && value.length == 0))
                return buffer; // Optional omitted
            try {
                if (this.repeated) {
                    var i;
                    // "Only repeated fields of primitive numeric types (types which use the varint, 32-bit, or 64-bit wire
                    // types) can be declared 'packed'."
                    if (this.options["packed"] && ProtoBuf.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType) >= 0) {
                        // "All of the elements of the field are packed into a single key-value pair with wire type 2
                        // (length-delimited). Each element is encoded the same way it would be normally, except without a
                        // tag preceding it."
                        buffer.writeVarint32((this.id << 3) | ProtoBuf.WIRE_TYPES.LDELIM);
                        buffer.ensureCapacity(buffer.offset += 1); // We do not know the length yet, so let's assume a varint of length 1
                        var start = buffer.offset; // Remember where the contents begin
                        for (i=0; i<value.length; i++)
                            this.element.encodeValue(this.id, value[i], buffer);
                        var len = buffer.offset-start,
                            varintLen = ByteBuffer.calculateVarint32(len);
                        if (varintLen > 1) { // We need to move the contents
                            var contents = buffer.slice(start, buffer.offset);
                            start += varintLen-1;
                            buffer.offset = start;
                            buffer.append(contents);
                        }
                        buffer.writeVarint32(len, start-varintLen);
                    } else {
                        // "If your message definition has repeated elements (without the [packed=true] option), the encoded
                        // message has zero or more key-value pairs with the same tag number"
                        for (i=0; i<value.length; i++)
                            buffer.writeVarint32((this.id << 3) | this.type.wireType),
                            this.element.encodeValue(this.id, value[i], buffer);
                    }
                } else if (this.map) {
                    // Write out each map entry as a submessage.
                    value.forEach(function(val, key, m) {
                        // Compute the length of the submessage (key, val) pair.
                        var length =
                            ByteBuffer.calculateVarint32((1 << 3) | this.keyType.wireType) +
                            this.keyElement.calculateLength(1, key) +
                            ByteBuffer.calculateVarint32((2 << 3) | this.type.wireType) +
                            this.element.calculateLength(2, val);

                        // Submessage with wire type of length-delimited.
                        buffer.writeVarint32((this.id << 3) | ProtoBuf.WIRE_TYPES.LDELIM);
                        buffer.writeVarint32(length);

                        // Write out the key and val.
                        buffer.writeVarint32((1 << 3) | this.keyType.wireType);
                        this.keyElement.encodeValue(1, key, buffer);
                        buffer.writeVarint32((2 << 3) | this.type.wireType);
                        this.element.encodeValue(2, val, buffer);
                    }, this);
                } else {
                    if (this.hasWirePresence(value, message)) {
                        buffer.writeVarint32((this.id << 3) | this.type.wireType);
                        this.element.encodeValue(this.id, value, buffer);
                    }
                }
            } catch (e) {
                throw Error("Illegal value for "+this.toString(true)+": "+value+" ("+e+")");
            }
            return buffer;
        };

        /**
         * Calculates the length of this field's value on the network level.
         * @param {*} value Field value
         * @param {!ProtoBuf.Builder.Message} message Runtime message
         * @returns {number} Byte length
         * @expose
         */
        FieldPrototype.calculate = function(value, message) {
            value = this.verifyValue(value); // May throw
            if (this.type === null || typeof this.type !== 'object')
                throw Error("[INTERNAL] Unresolved type in "+this.toString(true)+": "+this.type);
            if (value === null || (this.repeated && value.length == 0))
                return 0; // Optional omitted
            var n = 0;
            try {
                if (this.repeated) {
                    var i, ni;
                    if (this.options["packed"] && ProtoBuf.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType) >= 0) {
                        n += ByteBuffer.calculateVarint32((this.id << 3) | ProtoBuf.WIRE_TYPES.LDELIM);
                        ni = 0;
                        for (i=0; i<value.length; i++)
                            ni += this.element.calculateLength(this.id, value[i]);
                        n += ByteBuffer.calculateVarint32(ni);
                        n += ni;
                    } else {
                        for (i=0; i<value.length; i++)
                            n += ByteBuffer.calculateVarint32((this.id << 3) | this.type.wireType),
                            n += this.element.calculateLength(this.id, value[i]);
                    }
                } else if (this.map) {
                    // Each map entry becomes a submessage.
                    value.forEach(function(val, key, m) {
                        // Compute the length of the submessage (key, val) pair.
                        var length =
                            ByteBuffer.calculateVarint32((1 << 3) | this.keyType.wireType) +
                            this.keyElement.calculateLength(1, key) +
                            ByteBuffer.calculateVarint32((2 << 3) | this.type.wireType) +
                            this.element.calculateLength(2, val);

                        n += ByteBuffer.calculateVarint32((this.id << 3) | ProtoBuf.WIRE_TYPES.LDELIM);
                        n += ByteBuffer.calculateVarint32(length);
                        n += length;
                    }, this);
                } else {
                    if (this.hasWirePresence(value, message)) {
                        n += ByteBuffer.calculateVarint32((this.id << 3) | this.type.wireType);
                        n += this.element.calculateLength(this.id, value);
                    }
                }
            } catch (e) {
                throw Error("Illegal value for "+this.toString(true)+": "+value+" ("+e+")");
            }
            return n;
        };

        /**
         * Decode the field value from the specified buffer.
         * @param {number} wireType Leading wire type
         * @param {ByteBuffer} buffer ByteBuffer to decode from
         * @param {boolean=} skipRepeated Whether to skip the repeated check or not. Defaults to false.
         * @return {*} Decoded value: array for packed repeated fields, [key, value] for
         *             map fields, or an individual value otherwise.
         * @throws {Error} If the field cannot be decoded
         * @expose
         */
        FieldPrototype.decode = function(wireType, buffer, skipRepeated) {
            var value, nBytes;

            // We expect wireType to match the underlying type's wireType unless we see
            // a packed repeated field, or unless this is a map field.
            var wireTypeOK =
                (!this.map && wireType == this.type.wireType) ||
                (!skipRepeated && this.repeated && this.options["packed"] &&
                 wireType == ProtoBuf.WIRE_TYPES.LDELIM) ||
                (this.map && wireType == ProtoBuf.WIRE_TYPES.LDELIM);
            if (!wireTypeOK)
                throw Error("Illegal wire type for field "+this.toString(true)+": "+wireType+" ("+this.type.wireType+" expected)");

            // Handle packed repeated fields.
            if (wireType == ProtoBuf.WIRE_TYPES.LDELIM && this.repeated && this.options["packed"] && ProtoBuf.PACKABLE_WIRE_TYPES.indexOf(this.type.wireType) >= 0) {
                if (!skipRepeated) {
                    nBytes = buffer.readVarint32();
                    nBytes = buffer.offset + nBytes; // Limit
                    var values = [];
                    while (buffer.offset < nBytes)
                        values.push(this.decode(this.type.wireType, buffer, true));
                    return values;
                }
                // Read the next value otherwise...
            }

            // Handle maps.
            if (this.map) {
                // Read one (key, value) submessage, and return [key, value]
                var key = Element.defaultFieldValue(this.keyType);
                value = Element.defaultFieldValue(this.type);

                // Read the length
                nBytes = buffer.readVarint32();
                if (buffer.remaining() < nBytes)
                    throw Error("Illegal number of bytes for "+this.toString(true)+": "+nBytes+" required but got only "+buffer.remaining());

                // Get a sub-buffer of this key/value submessage
                var msgbuf = buffer.clone();
                msgbuf.limit = msgbuf.offset + nBytes;
                buffer.offset += nBytes;

                while (msgbuf.remaining() > 0) {
                    var tag = msgbuf.readVarint32();
                    wireType = tag & 0x07;
                    var id = tag >>> 3;
                    if (id === 1) {
                        key = this.keyElement.decode(msgbuf, wireType, id);
                    } else if (id === 2) {
                        value = this.element.decode(msgbuf, wireType, id);
                    } else {
                        throw Error("Unexpected tag in map field key/value submessage");
                    }
                }

                return [key, value];
            }

            // Handle singular and non-packed repeated field values.
            return this.element.decode(buffer, wireType, this.id);
        };

        /**
         * @alias ProtoBuf.Reflect.Message.Field
         * @expose
         */
        Reflect.Message.Field = Field;

        /**
         * Constructs a new Message ExtensionField.
         * @exports ProtoBuf.Reflect.Message.ExtensionField
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Message} message Message reference
         * @param {string} rule Rule, one of requried, optional, repeated
         * @param {string} type Data type, e.g. int32
         * @param {string} name Field name
         * @param {number} id Unique field id
         * @param {!Object.<string,*>=} options Options
         * @constructor
         * @extends ProtoBuf.Reflect.Message.Field
         */
        var ExtensionField = function(builder, message, rule, type, name, id, options) {
            Field.call(this, builder, message, rule, /* keytype = */ null, type, name, id, options);

            /**
             * Extension reference.
             * @type {!ProtoBuf.Reflect.Extension}
             * @expose
             */
            this.extension;
        };

        // Extends Field
        ExtensionField.prototype = Object.create(Field.prototype);

        /**
         * @alias ProtoBuf.Reflect.Message.ExtensionField
         * @expose
         */
        Reflect.Message.ExtensionField = ExtensionField;

        /**
         * Constructs a new Message OneOf.
         * @exports ProtoBuf.Reflect.Message.OneOf
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Message} message Message reference
         * @param {string} name OneOf name
         * @constructor
         * @extends ProtoBuf.Reflect.T
         */
        var OneOf = function(builder, message, name) {
            T.call(this, builder, message, name);

            /**
             * Enclosed fields.
             * @type {!Array.<!ProtoBuf.Reflect.Message.Field>}
             * @expose
             */
            this.fields = [];
        };

        /**
         * @alias ProtoBuf.Reflect.Message.OneOf
         * @expose
         */
        Reflect.Message.OneOf = OneOf;

        /**
         * Constructs a new Enum.
         * @exports ProtoBuf.Reflect.Enum
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.T} parent Parent Reflect object
         * @param {string} name Enum name
         * @param {Object.<string,*>=} options Enum options
         * @param {string?} syntax The syntax level (e.g., proto3)
         * @constructor
         * @extends ProtoBuf.Reflect.Namespace
         */
        var Enum = function(builder, parent, name, options, syntax) {
            Namespace.call(this, builder, parent, name, options, syntax);

            /**
             * @override
             */
            this.className = "Enum";

            /**
             * Runtime enum object.
             * @type {Object.<string,number>|null}
             * @expose
             */
            this.object = null;
        };

        /**
         * Gets the string name of an enum value.
         * @param {!ProtoBuf.Builder.Enum} enm Runtime enum
         * @param {number} value Enum value
         * @returns {?string} Name or `null` if not present
         * @expose
         */
        Enum.getName = function(enm, value) {
            var keys = Object.keys(enm);
            for (var i=0, key; i<keys.length; ++i)
                if (enm[key = keys[i]] === value)
                    return key;
            return null;
        };

        /**
         * @alias ProtoBuf.Reflect.Enum.prototype
         * @inner
         */
        var EnumPrototype = Enum.prototype = Object.create(Namespace.prototype);

        /**
         * Builds this enum and returns the runtime counterpart.
         * @param {boolean} rebuild Whether to rebuild or not, defaults to false
         * @returns {!Object.<string,number>}
         * @expose
         */
        EnumPrototype.build = function(rebuild) {
            if (this.object && !rebuild)
                return this.object;
            var enm = new ProtoBuf.Builder.Enum(),
                values = this.getChildren(Enum.Value);
            for (var i=0, k=values.length; i<k; ++i)
                enm[values[i]['name']] = values[i]['id'];
            if (Object.defineProperty)
                Object.defineProperty(enm, '$options', {
                    "value": this.buildOpt(),
                    "enumerable": false
                });
            return this.object = enm;
        };

        /**
         * @alias ProtoBuf.Reflect.Enum
         * @expose
         */
        Reflect.Enum = Enum;

        /**
         * Constructs a new Enum Value.
         * @exports ProtoBuf.Reflect.Enum.Value
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Enum} enm Enum reference
         * @param {string} name Field name
         * @param {number} id Unique field id
         * @constructor
         * @extends ProtoBuf.Reflect.T
         */
        var Value = function(builder, enm, name, id) {
            T.call(this, builder, enm, name);

            /**
             * @override
             */
            this.className = "Enum.Value";

            /**
             * Unique enum value id.
             * @type {number}
             * @expose
             */
            this.id = id;
        };

        // Extends T
        Value.prototype = Object.create(T.prototype);

        /**
         * @alias ProtoBuf.Reflect.Enum.Value
         * @expose
         */
        Reflect.Enum.Value = Value;

        /**
         * An extension (field).
         * @exports ProtoBuf.Reflect.Extension
         * @constructor
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.T} parent Parent object
         * @param {string} name Object name
         * @param {!ProtoBuf.Reflect.Message.Field} field Extension field
         */
        var Extension = function(builder, parent, name, field) {
            T.call(this, builder, parent, name);

            /**
             * Extended message field.
             * @type {!ProtoBuf.Reflect.Message.Field}
             * @expose
             */
            this.field = field;
        };

        // Extends T
        Extension.prototype = Object.create(T.prototype);

        /**
         * @alias ProtoBuf.Reflect.Extension
         * @expose
         */
        Reflect.Extension = Extension;

        /**
         * Constructs a new Service.
         * @exports ProtoBuf.Reflect.Service
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Namespace} root Root
         * @param {string} name Service name
         * @param {Object.<string,*>=} options Options
         * @constructor
         * @extends ProtoBuf.Reflect.Namespace
         */
        var Service = function(builder, root, name, options) {
            Namespace.call(this, builder, root, name, options);

            /**
             * @override
             */
            this.className = "Service";

            /**
             * Built runtime service class.
             * @type {?function(new:ProtoBuf.Builder.Service)}
             */
            this.clazz = null;
        };

        /**
         * @alias ProtoBuf.Reflect.Service.prototype
         * @inner
         */
        var ServicePrototype = Service.prototype = Object.create(Namespace.prototype);

        /**
         * Builds the service and returns the runtime counterpart, which is a fully functional class.
         * @see ProtoBuf.Builder.Service
         * @param {boolean=} rebuild Whether to rebuild or not
         * @return {Function} Service class
         * @throws {Error} If the message cannot be built
         * @expose
         */
        ServicePrototype.build = function(rebuild) {
            if (this.clazz && !rebuild)
                return this.clazz;

            // Create the runtime Service class in its own scope
            return this.clazz = (function(ProtoBuf, T) {

                /**
                 * Constructs a new runtime Service.
                 * @name ProtoBuf.Builder.Service
                 * @param {function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))=} rpcImpl RPC implementation receiving the method name and the message
                 * @class Barebone of all runtime services.
                 * @constructor
                 * @throws {Error} If the service cannot be created
                 */
                var Service = function(rpcImpl) {
                    ProtoBuf.Builder.Service.call(this);

                    /**
                     * Service implementation.
                     * @name ProtoBuf.Builder.Service#rpcImpl
                     * @type {!function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))}
                     * @expose
                     */
                    this.rpcImpl = rpcImpl || function(name, msg, callback) {
                        // This is what a user has to implement: A function receiving the method name, the actual message to
                        // send (type checked) and the callback that's either provided with the error as its first
                        // argument or null and the actual response message.
                        setTimeout(callback.bind(this, Error("Not implemented, see: https://github.com/dcodeIO/ProtoBuf.js/wiki/Services")), 0); // Must be async!
                    };
                };

                /**
                 * @alias ProtoBuf.Builder.Service.prototype
                 * @inner
                 */
                var ServicePrototype = Service.prototype = Object.create(ProtoBuf.Builder.Service.prototype);

                /**
                 * Asynchronously performs an RPC call using the given RPC implementation.
                 * @name ProtoBuf.Builder.Service.[Method]
                 * @function
                 * @param {!function(string, ProtoBuf.Builder.Message, function(Error, ProtoBuf.Builder.Message=))} rpcImpl RPC implementation
                 * @param {ProtoBuf.Builder.Message} req Request
                 * @param {function(Error, (ProtoBuf.Builder.Message|ByteBuffer|Buffer|string)=)} callback Callback receiving
                 *  the error if any and the response either as a pre-parsed message or as its raw bytes
                 * @abstract
                 */

                /**
                 * Asynchronously performs an RPC call using the instance's RPC implementation.
                 * @name ProtoBuf.Builder.Service#[Method]
                 * @function
                 * @param {ProtoBuf.Builder.Message} req Request
                 * @param {function(Error, (ProtoBuf.Builder.Message|ByteBuffer|Buffer|string)=)} callback Callback receiving
                 *  the error if any and the response either as a pre-parsed message or as its raw bytes
                 * @abstract
                 */

                var rpc = T.getChildren(ProtoBuf.Reflect.Service.RPCMethod);
                for (var i=0; i<rpc.length; i++) {
                    (function(method) {

                        // service#Method(message, callback)
                        ServicePrototype[method.name] = function(req, callback) {
                            try {
                                try {
                                    // If given as a buffer, decode the request. Will throw a TypeError if not a valid buffer.
                                    req = method.resolvedRequestType.clazz.decode(ByteBuffer.wrap(req));
                                } catch (err) {
                                    if (!(err instanceof TypeError))
                                        throw err;
                                }
                                if (req === null || typeof req !== 'object')
                                    throw Error("Illegal arguments");
                                if (!(req instanceof method.resolvedRequestType.clazz))
                                    req = new method.resolvedRequestType.clazz(req);
                                this.rpcImpl(method.fqn(), req, function(err, res) { // Assumes that this is properly async
                                    if (err) {
                                        callback(err);
                                        return;
                                    }
                                    // Coalesce to empty string when service response has empty content
                                    if (res === null)
                                        res = ''
                                    try { res = method.resolvedResponseType.clazz.decode(res); } catch (notABuffer) {}
                                    if (!res || !(res instanceof method.resolvedResponseType.clazz)) {
                                        callback(Error("Illegal response type received in service method "+ T.name+"#"+method.name));
                                        return;
                                    }
                                    callback(null, res);
                                });
                            } catch (err) {
                                setTimeout(callback.bind(this, err), 0);
                            }
                        };

                        // Service.Method(rpcImpl, message, callback)
                        Service[method.name] = function(rpcImpl, req, callback) {
                            new Service(rpcImpl)[method.name](req, callback);
                        };

                        if (Object.defineProperty)
                            Object.defineProperty(Service[method.name], "$options", { "value": method.buildOpt() }),
                            Object.defineProperty(ServicePrototype[method.name], "$options", { "value": Service[method.name]["$options"] });
                    })(rpc[i]);
                }

                // Properties

                /**
                 * Service options.
                 * @name ProtoBuf.Builder.Service.$options
                 * @type {Object.<string,*>}
                 * @expose
                 */
                var $optionsS; // cc needs this

                /**
                 * Service options.
                 * @name ProtoBuf.Builder.Service#$options
                 * @type {Object.<string,*>}
                 * @expose
                 */
                var $options;

                /**
                 * Reflection type.
                 * @name ProtoBuf.Builder.Service.$type
                 * @type {!ProtoBuf.Reflect.Service}
                 * @expose
                 */
                var $typeS;

                /**
                 * Reflection type.
                 * @name ProtoBuf.Builder.Service#$type
                 * @type {!ProtoBuf.Reflect.Service}
                 * @expose
                 */
                var $type;

                if (Object.defineProperty)
                    Object.defineProperty(Service, "$options", { "value": T.buildOpt() }),
                    Object.defineProperty(ServicePrototype, "$options", { "value": Service["$options"] }),
                    Object.defineProperty(Service, "$type", { "value": T }),
                    Object.defineProperty(ServicePrototype, "$type", { "value": T });

                return Service;

            })(ProtoBuf, this);
        };

        /**
         * @alias ProtoBuf.Reflect.Service
         * @expose
         */
        Reflect.Service = Service;

        /**
         * Abstract service method.
         * @exports ProtoBuf.Reflect.Service.Method
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Service} svc Service
         * @param {string} name Method name
         * @param {Object.<string,*>=} options Options
         * @constructor
         * @extends ProtoBuf.Reflect.T
         */
        var Method = function(builder, svc, name, options) {
            T.call(this, builder, svc, name);

            /**
             * @override
             */
            this.className = "Service.Method";

            /**
             * Options.
             * @type {Object.<string, *>}
             * @expose
             */
            this.options = options || {};
        };

        /**
         * @alias ProtoBuf.Reflect.Service.Method.prototype
         * @inner
         */
        var MethodPrototype = Method.prototype = Object.create(T.prototype);

        /**
         * Builds the method's '$options' property.
         * @name ProtoBuf.Reflect.Service.Method#buildOpt
         * @function
         * @return {Object.<string,*>}
         */
        MethodPrototype.buildOpt = NamespacePrototype.buildOpt;

        /**
         * @alias ProtoBuf.Reflect.Service.Method
         * @expose
         */
        Reflect.Service.Method = Method;

        /**
         * RPC service method.
         * @exports ProtoBuf.Reflect.Service.RPCMethod
         * @param {!ProtoBuf.Builder} builder Builder reference
         * @param {!ProtoBuf.Reflect.Service} svc Service
         * @param {string} name Method name
         * @param {string} request Request message name
         * @param {string} response Response message name
         * @param {boolean} request_stream Whether requests are streamed
         * @param {boolean} response_stream Whether responses are streamed
         * @param {Object.<string,*>=} options Options
         * @constructor
         * @extends ProtoBuf.Reflect.Service.Method
         */
        var RPCMethod = function(builder, svc, name, request, response, request_stream, response_stream, options) {
            Method.call(this, builder, svc, name, options);

            /**
             * @override
             */
            this.className = "Service.RPCMethod";

            /**
             * Request message name.
             * @type {string}
             * @expose
             */
            this.requestName = request;

            /**
             * Response message name.
             * @type {string}
             * @expose
             */
            this.responseName = response;

            /**
             * Whether requests are streamed
             * @type {bool}
             * @expose
             */
            this.requestStream = request_stream;

            /**
             * Whether responses are streamed
             * @type {bool}
             * @expose
             */
            this.responseStream = response_stream;

            /**
             * Resolved request message type.
             * @type {ProtoBuf.Reflect.Message}
             * @expose
             */
            this.resolvedRequestType = null;

            /**
             * Resolved response message type.
             * @type {ProtoBuf.Reflect.Message}
             * @expose
             */
            this.resolvedResponseType = null;
        };

        // Extends Method
        RPCMethod.prototype = Object.create(Method.prototype);

        /**
         * @alias ProtoBuf.Reflect.Service.RPCMethod
         * @expose
         */
        Reflect.Service.RPCMethod = RPCMethod;

        return Reflect;

    })(ProtoBuf);

    /**
     * @alias ProtoBuf.Builder
     * @expose
     */
    ProtoBuf.Builder = (function(ProtoBuf, Lang, Reflect) {
        "use strict";

        /**
         * Constructs a new Builder.
         * @exports ProtoBuf.Builder
         * @class Provides the functionality to build protocol messages.
         * @param {Object.<string,*>=} options Options
         * @constructor
         */
        var Builder = function(options) {

            /**
             * Namespace.
             * @type {ProtoBuf.Reflect.Namespace}
             * @expose
             */
            this.ns = new Reflect.Namespace(this, null, ""); // Global namespace

            /**
             * Namespace pointer.
             * @type {ProtoBuf.Reflect.T}
             * @expose
             */
            this.ptr = this.ns;

            /**
             * Resolved flag.
             * @type {boolean}
             * @expose
             */
            this.resolved = false;

            /**
             * The current building result.
             * @type {Object.<string,ProtoBuf.Builder.Message|Object>|null}
             * @expose
             */
            this.result = null;

            /**
             * Imported files.
             * @type {Array.<string>}
             * @expose
             */
            this.files = {};

            /**
             * Import root override.
             * @type {?string}
             * @expose
             */
            this.importRoot = null;

            /**
             * Options.
             * @type {!Object.<string, *>}
             * @expose
             */
            this.options = options || {};
        };

        /**
         * @alias ProtoBuf.Builder.prototype
         * @inner
         */
        var BuilderPrototype = Builder.prototype;

        // ----- Definition tests -----

        /**
         * Tests if a definition most likely describes a message.
         * @param {!Object} def
         * @returns {boolean}
         * @expose
         */
        Builder.isMessage = function(def) {
            // Messages require a string name
            if (typeof def["name"] !== 'string')
                return false;
            // Messages do not contain values (enum) or rpc methods (service)
            if (typeof def["values"] !== 'undefined' || typeof def["rpc"] !== 'undefined')
                return false;
            return true;
        };

        /**
         * Tests if a definition most likely describes a message field.
         * @param {!Object} def
         * @returns {boolean}
         * @expose
         */
        Builder.isMessageField = function(def) {
            // Message fields require a string rule, name and type and an id
            if (typeof def["rule"] !== 'string' || typeof def["name"] !== 'string' || typeof def["type"] !== 'string' || typeof def["id"] === 'undefined')
                return false;
            return true;
        };

        /**
         * Tests if a definition most likely describes an enum.
         * @param {!Object} def
         * @returns {boolean}
         * @expose
         */
        Builder.isEnum = function(def) {
            // Enums require a string name
            if (typeof def["name"] !== 'string')
                return false;
            // Enums require at least one value
            if (typeof def["values"] === 'undefined' || !Array.isArray(def["values"]) || def["values"].length === 0)
                return false;
            return true;
        };

        /**
         * Tests if a definition most likely describes a service.
         * @param {!Object} def
         * @returns {boolean}
         * @expose
         */
        Builder.isService = function(def) {
            // Services require a string name and an rpc object
            if (typeof def["name"] !== 'string' || typeof def["rpc"] !== 'object' || !def["rpc"])
                return false;
            return true;
        };

        /**
         * Tests if a definition most likely describes an extended message
         * @param {!Object} def
         * @returns {boolean}
         * @expose
         */
        Builder.isExtend = function(def) {
            // Extends rquire a string ref
            if (typeof def["ref"] !== 'string')
                return false;
            return true;
        };

        // ----- Building -----

        /**
         * Resets the pointer to the root namespace.
         * @returns {!ProtoBuf.Builder} this
         * @expose
         */
        BuilderPrototype.reset = function() {
            this.ptr = this.ns;
            return this;
        };

        /**
         * Defines a namespace on top of the current pointer position and places the pointer on it.
         * @param {string} namespace
         * @return {!ProtoBuf.Builder} this
         * @expose
         */
        BuilderPrototype.define = function(namespace) {
            if (typeof namespace !== 'string' || !Lang.TYPEREF.test(namespace))
                throw Error("illegal namespace: "+namespace);
            namespace.split(".").forEach(function(part) {
                var ns = this.ptr.getChild(part);
                if (ns === null) // Keep existing
                    this.ptr.addChild(ns = new Reflect.Namespace(this, this.ptr, part));
                this.ptr = ns;
            }, this);
            return this;
        };

        /**
         * Creates the specified definitions at the current pointer position.
         * @param {!Array.<!Object>} defs Messages, enums or services to create
         * @returns {!ProtoBuf.Builder} this
         * @throws {Error} If a message definition is invalid
         * @expose
         */
        BuilderPrototype.create = function(defs) {
            if (!defs)
                return this; // Nothing to create
            if (!Array.isArray(defs))
                defs = [defs];
            else {
                if (defs.length === 0)
                    return this;
                defs = defs.slice();
            }

            // It's quite hard to keep track of scopes and memory here, so let's do this iteratively.
            var stack = [defs];
            while (stack.length > 0) {
                defs = stack.pop();

                if (!Array.isArray(defs)) // Stack always contains entire namespaces
                    throw Error("not a valid namespace: "+JSON.stringify(defs));

                while (defs.length > 0) {
                    var def = defs.shift(); // Namespaces always contain an array of messages, enums and services

                    if (Builder.isMessage(def)) {
                        var obj = new Reflect.Message(this, this.ptr, def["name"], def["options"], def["isGroup"], def["syntax"]);

                        // Create OneOfs
                        var oneofs = {};
                        if (def["oneofs"])
                            Object.keys(def["oneofs"]).forEach(function(name) {
                                obj.addChild(oneofs[name] = new Reflect.Message.OneOf(this, obj, name));
                            }, this);

                        // Create fields
                        if (def["fields"])
                            def["fields"].forEach(function(fld) {
                                if (obj.getChild(fld["id"]|0) !== null)
                                    throw Error("duplicate or invalid field id in "+obj.name+": "+fld['id']);
                                if (fld["options"] && typeof fld["options"] !== 'object')
                                    throw Error("illegal field options in "+obj.name+"#"+fld["name"]);
                                var oneof = null;
                                if (typeof fld["oneof"] === 'string' && !(oneof = oneofs[fld["oneof"]]))
                                    throw Error("illegal oneof in "+obj.name+"#"+fld["name"]+": "+fld["oneof"]);
                                fld = new Reflect.Message.Field(this, obj, fld["rule"], fld["keytype"], fld["type"], fld["name"], fld["id"], fld["options"], oneof, def["syntax"]);
                                if (oneof)
                                    oneof.fields.push(fld);
                                obj.addChild(fld);
                            }, this);

                        // Push children to stack
                        var subObj = [];
                        if (def["enums"])
                            def["enums"].forEach(function(enm) {
                                subObj.push(enm);
                            });
                        if (def["messages"])
                            def["messages"].forEach(function(msg) {
                                subObj.push(msg);
                            });
                        if (def["services"])
                            def["services"].forEach(function(svc) {
                                subObj.push(svc);
                            });

                        // Set extension ranges
                        if (def["extensions"]) {
                            if (typeof def["extensions"][0] === 'number') // pre 5.0.1
                                obj.extensions = [ def["extensions"] ];
                            else
                                obj.extensions = def["extensions"];
                        }

                        // Create on top of current namespace
                        this.ptr.addChild(obj);
                        if (subObj.length > 0) {
                            stack.push(defs); // Push the current level back
                            defs = subObj; // Continue processing sub level
                            subObj = null;
                            this.ptr = obj; // And move the pointer to this namespace
                            obj = null;
                            continue;
                        }
                        subObj = null;

                    } else if (Builder.isEnum(def)) {

                        obj = new Reflect.Enum(this, this.ptr, def["name"], def["options"], def["syntax"]);
                        def["values"].forEach(function(val) {
                            obj.addChild(new Reflect.Enum.Value(this, obj, val["name"], val["id"]));
                        }, this);
                        this.ptr.addChild(obj);

                    } else if (Builder.isService(def)) {

                        obj = new Reflect.Service(this, this.ptr, def["name"], def["options"]);
                        Object.keys(def["rpc"]).forEach(function(name) {
                            var mtd = def["rpc"][name];
                            obj.addChild(new Reflect.Service.RPCMethod(this, obj, name, mtd["request"], mtd["response"], !!mtd["request_stream"], !!mtd["response_stream"], mtd["options"]));
                        }, this);
                        this.ptr.addChild(obj);

                    } else if (Builder.isExtend(def)) {

                        obj = this.ptr.resolve(def["ref"], true);
                        if (obj) {
                            def["fields"].forEach(function(fld) {
                                if (obj.getChild(fld['id']|0) !== null)
                                    throw Error("duplicate extended field id in "+obj.name+": "+fld['id']);
                                // Check if field id is allowed to be extended
                                if (obj.extensions) {
                                    var valid = false;
                                    obj.extensions.forEach(function(range) {
                                        if (fld["id"] >= range[0] && fld["id"] <= range[1])
                                            valid = true;
                                    });
                                    if (!valid)
                                        throw Error("illegal extended field id in "+obj.name+": "+fld['id']+" (not within valid ranges)");
                                }
                                // Convert extension field names to camel case notation if the override is set
                                var name = fld["name"];
                                if (this.options['convertFieldsToCamelCase'])
                                    name = ProtoBuf.Util.toCamelCase(name);
                                // see #161: Extensions use their fully qualified name as their runtime key and...
                                var field = new Reflect.Message.ExtensionField(this, obj, fld["rule"], fld["type"], this.ptr.fqn()+'.'+name, fld["id"], fld["options"]);
                                // ...are added on top of the current namespace as an extension which is used for
                                // resolving their type later on (the extension always keeps the original name to
                                // prevent naming collisions)
                                var ext = new Reflect.Extension(this, this.ptr, fld["name"], field);
                                field.extension = ext;
                                this.ptr.addChild(ext);
                                obj.addChild(field);
                            }, this);

                        } else if (!/\.?google\.protobuf\./.test(def["ref"])) // Silently skip internal extensions
                            throw Error("extended message "+def["ref"]+" is not defined");

                    } else
                        throw Error("not a valid definition: "+JSON.stringify(def));

                    def = null;
                    obj = null;
                }
                // Break goes here
                defs = null;
                this.ptr = this.ptr.parent; // Namespace done, continue at parent
            }
            this.resolved = false; // Require re-resolve
            this.result = null; // Require re-build
            return this;
        };

        /**
         * Propagates syntax to all children.
         * @param {!Object} parent
         * @inner
         */
        function propagateSyntax(parent) {
            if (parent['messages']) {
                parent['messages'].forEach(function(child) {
                    child["syntax"] = parent["syntax"];
                    propagateSyntax(child);
                });
            }
            if (parent['enums']) {
                parent['enums'].forEach(function(child) {
                    child["syntax"] = parent["syntax"];
                });
            }
        }

        /**
         * Imports another definition into this builder.
         * @param {Object.<string,*>} json Parsed import
         * @param {(string|{root: string, file: string})=} filename Imported file name
         * @returns {!ProtoBuf.Builder} this
         * @throws {Error} If the definition or file cannot be imported
         * @expose
         */
        BuilderPrototype["import"] = function(json, filename) {
            var delim = '/';

            // Make sure to skip duplicate imports

            if (typeof filename === 'string') {

                if (ProtoBuf.Util.IS_NODE)
                    filename = require("path")['resolve'](filename);
                if (this.files[filename] === true)
                    return this.reset();
                this.files[filename] = true;

            } else if (typeof filename === 'object') { // Object with root, file.

                var root = filename.root;
                if (ProtoBuf.Util.IS_NODE)
                    root = require("path")['resolve'](root);
                if (root.indexOf("\\") >= 0 || filename.file.indexOf("\\") >= 0)
                    delim = '\\';
                var fname = root + delim + filename.file;
                if (this.files[fname] === true)
                    return this.reset();
                this.files[fname] = true;
            }

            // Import imports

            if (json['imports'] && json['imports'].length > 0) {
                var importRoot,
                    resetRoot = false;

                if (typeof filename === 'object') { // If an import root is specified, override

                    this.importRoot = filename["root"]; resetRoot = true; // ... and reset afterwards
                    importRoot = this.importRoot;
                    filename = filename["file"];
                    if (importRoot.indexOf("\\") >= 0 || filename.indexOf("\\") >= 0)
                        delim = '\\';

                } else if (typeof filename === 'string') {

                    if (this.importRoot) // If import root is overridden, use it
                        importRoot = this.importRoot;
                    else { // Otherwise compute from filename
                        if (filename.indexOf("/") >= 0) { // Unix
                            importRoot = filename.replace(/\/[^\/]*$/, "");
                            if (/* /file.proto */ importRoot === "")
                                importRoot = "/";
                        } else if (filename.indexOf("\\") >= 0) { // Windows
                            importRoot = filename.replace(/\\[^\\]*$/, "");
                            delim = '\\';
                        } else
                            importRoot = ".";
                    }

                } else
                    importRoot = null;

                for (var i=0; i<json['imports'].length; i++) {
                    if (typeof json['imports'][i] === 'string') { // Import file
                        if (!importRoot)
                            throw Error("cannot determine import root");
                        var importFilename = json['imports'][i];
                        if (importFilename === "google/protobuf/descriptor.proto")
                            continue; // Not needed and therefore not used
                        importFilename = importRoot + delim + importFilename;
                        if (this.files[importFilename] === true)
                            continue; // Already imported
                        if (/\.proto$/i.test(importFilename) && !ProtoBuf.DotProto)       // If this is a light build
                            importFilename = importFilename.replace(/\.proto$/, ".json"); // always load the JSON file
                        var contents = ProtoBuf.Util.fetch(importFilename);
                        if (contents === null)
                            throw Error("failed to import '"+importFilename+"' in '"+filename+"': file not found");
                        if (/\.json$/i.test(importFilename)) // Always possible
                            this["import"](JSON.parse(contents+""), importFilename); // May throw
                        else
                            this["import"](ProtoBuf.DotProto.Parser.parse(contents), importFilename); // May throw
                    } else // Import structure
                        if (!filename)
                            this["import"](json['imports'][i]);
                        else if (/\.(\w+)$/.test(filename)) // With extension: Append _importN to the name portion to make it unique
                            this["import"](json['imports'][i], filename.replace(/^(.+)\.(\w+)$/, function($0, $1, $2) { return $1+"_import"+i+"."+$2; }));
                        else // Without extension: Append _importN to make it unique
                            this["import"](json['imports'][i], filename+"_import"+i);
                }
                if (resetRoot) // Reset import root override when all imports are done
                    this.importRoot = null;
            }

            // Import structures

            if (json['package'])
                this.define(json['package']);
            if (json['syntax'])
                propagateSyntax(json);
            var base = this.ptr;
            if (json['options'])
                Object.keys(json['options']).forEach(function(key) {
                    base.options[key] = json['options'][key];
                });
            if (json['messages'])
                this.create(json['messages']),
                this.ptr = base;
            if (json['enums'])
                this.create(json['enums']),
                this.ptr = base;
            if (json['services'])
                this.create(json['services']),
                this.ptr = base;
            if (json['extends'])
                this.create(json['extends']);

            return this.reset();
        };

        /**
         * Resolves all namespace objects.
         * @throws {Error} If a type cannot be resolved
         * @returns {!ProtoBuf.Builder} this
         * @expose
         */
        BuilderPrototype.resolveAll = function() {
            // Resolve all reflected objects
            var res;
            if (this.ptr == null || typeof this.ptr.type === 'object')
                return this; // Done (already resolved)

            if (this.ptr instanceof Reflect.Namespace) { // Resolve children

                this.ptr.children.forEach(function(child) {
                    this.ptr = child;
                    this.resolveAll();
                }, this);

            } else if (this.ptr instanceof Reflect.Message.Field) { // Resolve type

                if (!Lang.TYPE.test(this.ptr.type)) {
                    if (!Lang.TYPEREF.test(this.ptr.type))
                        throw Error("illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.type);
                    res = (this.ptr instanceof Reflect.Message.ExtensionField ? this.ptr.extension.parent : this.ptr.parent).resolve(this.ptr.type, true);
                    if (!res)
                        throw Error("unresolvable type reference in "+this.ptr.toString(true)+": "+this.ptr.type);
                    this.ptr.resolvedType = res;
                    if (res instanceof Reflect.Enum) {
                        this.ptr.type = ProtoBuf.TYPES["enum"];
                        if (this.ptr.syntax === 'proto3' && res.syntax !== 'proto3')
                            throw Error("proto3 message cannot reference proto2 enum");
                    }
                    else if (res instanceof Reflect.Message)
                        this.ptr.type = res.isGroup ? ProtoBuf.TYPES["group"] : ProtoBuf.TYPES["message"];
                    else
                        throw Error("illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.type);
                } else
                    this.ptr.type = ProtoBuf.TYPES[this.ptr.type];

                // If it's a map field, also resolve the key type. The key type can be only a numeric, string, or bool type
                // (i.e., no enums or messages), so we don't need to resolve against the current namespace.
                if (this.ptr.map) {
                    if (!Lang.TYPE.test(this.ptr.keyType))
                        throw Error("illegal key type for map field in "+this.ptr.toString(true)+": "+this.ptr.keyType);
                    this.ptr.keyType = ProtoBuf.TYPES[this.ptr.keyType];
                }

            } else if (this.ptr instanceof ProtoBuf.Reflect.Service.Method) {

                if (this.ptr instanceof ProtoBuf.Reflect.Service.RPCMethod) {
                    res = this.ptr.parent.resolve(this.ptr.requestName, true);
                    if (!res || !(res instanceof ProtoBuf.Reflect.Message))
                        throw Error("Illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.requestName);
                    this.ptr.resolvedRequestType = res;
                    res = this.ptr.parent.resolve(this.ptr.responseName, true);
                    if (!res || !(res instanceof ProtoBuf.Reflect.Message))
                        throw Error("Illegal type reference in "+this.ptr.toString(true)+": "+this.ptr.responseName);
                    this.ptr.resolvedResponseType = res;
                } else // Should not happen as nothing else is implemented
                    throw Error("illegal service type in "+this.ptr.toString(true));

            } else if (
                !(this.ptr instanceof ProtoBuf.Reflect.Message.OneOf) && // Not built
                !(this.ptr instanceof ProtoBuf.Reflect.Extension) && // Not built
                !(this.ptr instanceof ProtoBuf.Reflect.Enum.Value) // Built in enum
            )
                throw Error("illegal object in namespace: "+typeof(this.ptr)+": "+this.ptr);

            return this.reset();
        };

        /**
         * Builds the protocol. This will first try to resolve all definitions and, if this has been successful,
         * return the built package.
         * @param {(string|Array.<string>)=} path Specifies what to return. If omitted, the entire namespace will be returned.
         * @returns {!ProtoBuf.Builder.Message|!Object.<string,*>}
         * @throws {Error} If a type could not be resolved
         * @expose
         */
        BuilderPrototype.build = function(path) {
            this.reset();
            if (!this.resolved)
                this.resolveAll(),
                this.resolved = true,
                this.result = null; // Require re-build
            if (this.result === null) // (Re-)Build
                this.result = this.ns.build();
            if (!path)
                return this.result;
            var part = typeof path === 'string' ? path.split(".") : path,
                ptr = this.result; // Build namespace pointer (no hasChild etc.)
            for (var i=0; i<part.length; i++)
                if (ptr[part[i]])
                    ptr = ptr[part[i]];
                else {
                    ptr = null;
                    break;
                }
            return ptr;
        };

        /**
         * Similar to {@link ProtoBuf.Builder#build}, but looks up the internal reflection descriptor.
         * @param {string=} path Specifies what to return. If omitted, the entire namespace wiil be returned.
         * @param {boolean=} excludeNonNamespace Excludes non-namespace types like fields, defaults to `false`
         * @returns {?ProtoBuf.Reflect.T} Reflection descriptor or `null` if not found
         */
        BuilderPrototype.lookup = function(path, excludeNonNamespace) {
            return path ? this.ns.resolve(path, excludeNonNamespace) : this.ns;
        };

        /**
         * Returns a string representation of this object.
         * @return {string} String representation as of "Builder"
         * @expose
         */
        BuilderPrototype.toString = function() {
            return "Builder";
        };

        // ----- Base classes -----
        // Exist for the sole purpose of being able to "... instanceof ProtoBuf.Builder.Message" etc.

        /**
         * @alias ProtoBuf.Builder.Message
         */
        Builder.Message = function() {};

        /**
         * @alias ProtoBuf.Builder.Enum
         */
        Builder.Enum = function() {};

        /**
         * @alias ProtoBuf.Builder.Message
         */
        Builder.Service = function() {};

        return Builder;

    })(ProtoBuf, ProtoBuf.Lang, ProtoBuf.Reflect);

    /**
     * @alias ProtoBuf.Map
     * @expose
     */
    ProtoBuf.Map = (function(ProtoBuf, Reflect) {
        "use strict";

        /**
         * Constructs a new Map. A Map is a container that is used to implement map
         * fields on message objects. It closely follows the ES6 Map API; however,
         * it is distinct because we do not want to depend on external polyfills or
         * on ES6 itself.
         *
         * @exports ProtoBuf.Map
         * @param {!ProtoBuf.Reflect.Field} field Map field
         * @param {Object.<string,*>=} contents Initial contents
         * @constructor
         */
        var Map = function(field, contents) {
            if (!field.map)
                throw Error("field is not a map");

            /**
             * The field corresponding to this map.
             * @type {!ProtoBuf.Reflect.Field}
             */
            this.field = field;

            /**
             * Element instance corresponding to key type.
             * @type {!ProtoBuf.Reflect.Element}
             */
            this.keyElem = new Reflect.Element(field.keyType, null, true, field.syntax);

            /**
             * Element instance corresponding to value type.
             * @type {!ProtoBuf.Reflect.Element}
             */
            this.valueElem = new Reflect.Element(field.type, field.resolvedType, false, field.syntax);

            /**
             * Internal map: stores mapping of (string form of key) -> (key, value)
             * pair.
             *
             * We provide map semantics for arbitrary key types, but we build on top
             * of an Object, which has only string keys. In order to avoid the need
             * to convert a string key back to its native type in many situations,
             * we store the native key value alongside the value. Thus, we only need
             * a one-way mapping from a key type to its string form that guarantees
             * uniqueness and equality (i.e., str(K1) === str(K2) if and only if K1
             * === K2).
             *
             * @type {!Object<string, {key: *, value: *}>}
             */
            this.map = {};

            /**
             * Returns the number of elements in the map.
             */
            Object.defineProperty(this, "size", {
                get: function() { return Object.keys(this.map).length; }
            });

            // Fill initial contents from a raw object.
            if (contents) {
                var keys = Object.keys(contents);
                for (var i = 0; i < keys.length; i++) {
                    var key = this.keyElem.valueFromString(keys[i]);
                    var val = this.valueElem.verifyValue(contents[keys[i]]);
                    this.map[this.keyElem.valueToString(key)] =
                        { key: key, value: val };
                }
            }
        };

        var MapPrototype = Map.prototype;

        /**
         * Helper: return an iterator over an array.
         * @param {!Array<*>} arr the array
         * @returns {!Object} an iterator
         * @inner
         */
        function arrayIterator(arr) {
            var idx = 0;
            return {
                next: function() {
                    if (idx < arr.length)
                        return { done: false, value: arr[idx++] };
                    return { done: true };
                }
            }
        }

        /**
         * Clears the map.
         */
        MapPrototype.clear = function() {
            this.map = {};
        };

        /**
         * Deletes a particular key from the map.
         * @returns {boolean} Whether any entry with this key was deleted.
         */
        MapPrototype["delete"] = function(key) {
            var keyValue = this.keyElem.valueToString(this.keyElem.verifyValue(key));
            var hadKey = keyValue in this.map;
            delete this.map[keyValue];
            return hadKey;
        };

        /**
         * Returns an iterator over [key, value] pairs in the map.
         * @returns {Object} The iterator
         */
        MapPrototype.entries = function() {
            var entries = [];
            var strKeys = Object.keys(this.map);
            for (var i = 0, entry; i < strKeys.length; i++)
                entries.push([(entry=this.map[strKeys[i]]).key, entry.value]);
            return arrayIterator(entries);
        };

        /**
         * Returns an iterator over keys in the map.
         * @returns {Object} The iterator
         */
        MapPrototype.keys = function() {
            var keys = [];
            var strKeys = Object.keys(this.map);
            for (var i = 0; i < strKeys.length; i++)
                keys.push(this.map[strKeys[i]].key);
            return arrayIterator(keys);
        };

        /**
         * Returns an iterator over values in the map.
         * @returns {!Object} The iterator
         */
        MapPrototype.values = function() {
            var values = [];
            var strKeys = Object.keys(this.map);
            for (var i = 0; i < strKeys.length; i++)
                values.push(this.map[strKeys[i]].value);
            return arrayIterator(values);
        };

        /**
         * Iterates over entries in the map, calling a function on each.
         * @param {function(this:*, *, *, *)} cb The callback to invoke with value, key, and map arguments.
         * @param {Object=} thisArg The `this` value for the callback
         */
        MapPrototype.forEach = function(cb, thisArg) {
            var strKeys = Object.keys(this.map);
            for (var i = 0, entry; i < strKeys.length; i++)
                cb.call(thisArg, (entry=this.map[strKeys[i]]).value, entry.key, this);
        };

        /**
         * Sets a key in the map to the given value.
         * @param {*} key The key
         * @param {*} value The value
         * @returns {!ProtoBuf.Map} The map instance
         */
        MapPrototype.set = function(key, value) {
            var keyValue = this.keyElem.verifyValue(key);
            var valValue = this.valueElem.verifyValue(value);
            this.map[this.keyElem.valueToString(keyValue)] =
                { key: keyValue, value: valValue };
            return this;
        };

        /**
         * Gets the value corresponding to a key in the map.
         * @param {*} key The key
         * @returns {*|undefined} The value, or `undefined` if key not present
         */
        MapPrototype.get = function(key) {
            var keyValue = this.keyElem.valueToString(this.keyElem.verifyValue(key));
            if (!(keyValue in this.map))
                return undefined;
            return this.map[keyValue].value;
        };

        /**
         * Determines whether the given key is present in the map.
         * @param {*} key The key
         * @returns {boolean} `true` if the key is present
         */
        MapPrototype.has = function(key) {
            var keyValue = this.keyElem.valueToString(this.keyElem.verifyValue(key));
            return (keyValue in this.map);
        };

        return Map;
    })(ProtoBuf, ProtoBuf.Reflect);


    /**
     * Loads a .proto string and returns the Builder.
     * @param {string} proto .proto file contents
     * @param {(ProtoBuf.Builder|string|{root: string, file: string})=} builder Builder to append to. Will create a new one if omitted.
     * @param {(string|{root: string, file: string})=} filename The corresponding file name if known. Must be specified for imports.
     * @return {ProtoBuf.Builder} Builder to create new messages
     * @throws {Error} If the definition cannot be parsed or built
     * @expose
     */
    ProtoBuf.loadProto = function(proto, builder, filename) {
        if (typeof builder === 'string' || (builder && typeof builder["file"] === 'string' && typeof builder["root"] === 'string'))
            filename = builder,
            builder = undefined;
        return ProtoBuf.loadJson(ProtoBuf.DotProto.Parser.parse(proto), builder, filename);
    };

    /**
     * Loads a .proto string and returns the Builder. This is an alias of {@link ProtoBuf.loadProto}.
     * @function
     * @param {string} proto .proto file contents
     * @param {(ProtoBuf.Builder|string)=} builder Builder to append to. Will create a new one if omitted.
     * @param {(string|{root: string, file: string})=} filename The corresponding file name if known. Must be specified for imports.
     * @return {ProtoBuf.Builder} Builder to create new messages
     * @throws {Error} If the definition cannot be parsed or built
     * @expose
     */
    ProtoBuf.protoFromString = ProtoBuf.loadProto; // Legacy

    /**
     * Loads a .proto file and returns the Builder.
     * @param {string|{root: string, file: string}} filename Path to proto file or an object specifying 'file' with
     *  an overridden 'root' path for all imported files.
     * @param {function(?Error, !ProtoBuf.Builder=)=} callback Callback that will receive `null` as the first and
     *  the Builder as its second argument on success, otherwise the error as its first argument. If omitted, the
     *  file will be read synchronously and this function will return the Builder.
     * @param {ProtoBuf.Builder=} builder Builder to append to. Will create a new one if omitted.
     * @return {?ProtoBuf.Builder|undefined} The Builder if synchronous (no callback specified, will be NULL if the
     *   request has failed), else undefined
     * @expose
     */
    ProtoBuf.loadProtoFile = function(filename, callback, builder) {
        if (callback && typeof callback === 'object')
            builder = callback,
            callback = null;
        else if (!callback || typeof callback !== 'function')
            callback = null;
        if (callback)
            return ProtoBuf.Util.fetch(typeof filename === 'string' ? filename : filename["root"]+"/"+filename["file"], function(contents) {
                if (contents === null) {
                    callback(Error("Failed to fetch file"));
                    return;
                }
                try {
                    callback(null, ProtoBuf.loadProto(contents, builder, filename));
                } catch (e) {
                    callback(e);
                }
            });
        var contents = ProtoBuf.Util.fetch(typeof filename === 'object' ? filename["root"]+"/"+filename["file"] : filename);
        return contents === null ? null : ProtoBuf.loadProto(contents, builder, filename);
    };

    /**
     * Loads a .proto file and returns the Builder. This is an alias of {@link ProtoBuf.loadProtoFile}.
     * @function
     * @param {string|{root: string, file: string}} filename Path to proto file or an object specifying 'file' with
     *  an overridden 'root' path for all imported files.
     * @param {function(?Error, !ProtoBuf.Builder=)=} callback Callback that will receive `null` as the first and
     *  the Builder as its second argument on success, otherwise the error as its first argument. If omitted, the
     *  file will be read synchronously and this function will return the Builder.
     * @param {ProtoBuf.Builder=} builder Builder to append to. Will create a new one if omitted.
     * @return {!ProtoBuf.Builder|undefined} The Builder if synchronous (no callback specified, will be NULL if the
     *   request has failed), else undefined
     * @expose
     */
    ProtoBuf.protoFromFile = ProtoBuf.loadProtoFile; // Legacy


    /**
     * Constructs a new empty Builder.
     * @param {Object.<string,*>=} options Builder options, defaults to global options set on ProtoBuf
     * @return {!ProtoBuf.Builder} Builder
     * @expose
     */
    ProtoBuf.newBuilder = function(options) {
        options = options || {};
        if (typeof options['convertFieldsToCamelCase'] === 'undefined')
            options['convertFieldsToCamelCase'] = ProtoBuf.convertFieldsToCamelCase;
        if (typeof options['populateAccessors'] === 'undefined')
            options['populateAccessors'] = ProtoBuf.populateAccessors;
        return new ProtoBuf.Builder(options);
    };

    /**
     * Loads a .json definition and returns the Builder.
     * @param {!*|string} json JSON definition
     * @param {(ProtoBuf.Builder|string|{root: string, file: string})=} builder Builder to append to. Will create a new one if omitted.
     * @param {(string|{root: string, file: string})=} filename The corresponding file name if known. Must be specified for imports.
     * @return {ProtoBuf.Builder} Builder to create new messages
     * @throws {Error} If the definition cannot be parsed or built
     * @expose
     */
    ProtoBuf.loadJson = function(json, builder, filename) {
        if (typeof builder === 'string' || (builder && typeof builder["file"] === 'string' && typeof builder["root"] === 'string'))
            filename = builder,
            builder = null;
        if (!builder || typeof builder !== 'object')
            builder = ProtoBuf.newBuilder();
        if (typeof json === 'string')
            json = JSON.parse(json);
        builder["import"](json, filename);
        builder.resolveAll();
        return builder;
    };

    /**
     * Loads a .json file and returns the Builder.
     * @param {string|!{root: string, file: string}} filename Path to json file or an object specifying 'file' with
     *  an overridden 'root' path for all imported files.
     * @param {function(?Error, !ProtoBuf.Builder=)=} callback Callback that will receive `null` as the first and
     *  the Builder as its second argument on success, otherwise the error as its first argument. If omitted, the
     *  file will be read synchronously and this function will return the Builder.
     * @param {ProtoBuf.Builder=} builder Builder to append to. Will create a new one if omitted.
     * @return {?ProtoBuf.Builder|undefined} The Builder if synchronous (no callback specified, will be NULL if the
     *   request has failed), else undefined
     * @expose
     */
    ProtoBuf.loadJsonFile = function(filename, callback, builder) {
        if (callback && typeof callback === 'object')
            builder = callback,
            callback = null;
        else if (!callback || typeof callback !== 'function')
            callback = null;
        if (callback)
            return ProtoBuf.Util.fetch(typeof filename === 'string' ? filename : filename["root"]+"/"+filename["file"], function(contents) {
                if (contents === null) {
                    callback(Error("Failed to fetch file"));
                    return;
                }
                try {
                    callback(null, ProtoBuf.loadJson(JSON.parse(contents), builder, filename));
                } catch (e) {
                    callback(e);
                }
            });
        var contents = ProtoBuf.Util.fetch(typeof filename === 'object' ? filename["root"]+"/"+filename["file"] : filename);
        return contents === null ? null : ProtoBuf.loadJson(JSON.parse(contents), builder, filename);
    };

    return ProtoBuf;
});

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    ns.SignalError = class SignalError extends Error {};

    ns.UntrustedIdentityKeyError = class UntrustedIdentityKeyError extends ns.SignalError {
        constructor(addr, identityKey) {
            super();
            this.name = 'UntrustedIdentityKeyError';
            this.addr = addr;
            this.identityKey = identityKey;
        }
    };

    ns.SessionError = class SessionError extends ns.SignalError {
        constructor(message, extra) {
            super(message);
            this.name = 'SessionError';
            if (extra) {
                Object.assign(this, extra);
            }
        }
    };

    ns.MessageCounterError = class MessageCounterError extends ns.SessionError {
        constructor(message) {
            super(message);
            this.name = 'MessageCounterError';
        }
    };

    ns.PreKeyError = class PreKeyError extends ns.SessionError {
        constructor(message) {
            super(message);
            this.name = 'PreKeyError';
        }
    };
})();

// vim: ts=4:sw=4:expandtab
/* global Module */

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    // Insert some bytes into the emscripten memory and return a pointer
    function _allocate(bytes) {
        var address = Module._malloc(bytes.length);
        Module.HEAPU8.set(bytes, address);

        return address;
    }

    function _readBytes(address, length, array) {
        array.set(Module.HEAPU8.subarray(address, address + length));
    }

    var basepoint = new Uint8Array(32);
    basepoint[0] = 9;

    ns.curve25519 = {
        keyPair: function(privKey) {
            var priv = new Uint8Array(privKey);
            priv[0]  &= 248;
            priv[31] &= 127;
            priv[31] |= 64;

            // Where to store the result
            var publicKey_ptr = Module._malloc(32);

            // Get a pointer to the private key
            var privateKey_ptr = _allocate(priv);

            // The basepoint for generating public keys
            var basepoint_ptr = _allocate(basepoint);

            // The return value is just 0, the operation is done in place
            Module._curve25519_donna(publicKey_ptr, privateKey_ptr, basepoint_ptr);

            var res = new Uint8Array(32);
            _readBytes(publicKey_ptr, 32, res);

            Module._free(publicKey_ptr);
            Module._free(privateKey_ptr);
            Module._free(basepoint_ptr);

            return {
                pubKey: res.buffer,
                privKey: priv.buffer
            };
        },

        sharedSecret: function(pubKey, privKey) {
            // Where to store the result
            var sharedKey_ptr = Module._malloc(32);

            // Get a pointer to our private key
            var privateKey_ptr = _allocate(new Uint8Array(privKey));

            // Get a pointer to their public key, the basepoint when you're
            // generating a shared secret
            var basepoint_ptr = _allocate(new Uint8Array(pubKey));

            // Return value is 0 here too of course
            Module._curve25519_donna(sharedKey_ptr, privateKey_ptr, basepoint_ptr);

            var res = new Uint8Array(32);
            _readBytes(sharedKey_ptr, 32, res);

            Module._free(sharedKey_ptr);
            Module._free(privateKey_ptr);
            Module._free(basepoint_ptr);

            return res.buffer;
        },

        sign: function(privKey, message) {
            // Where to store the result
            var signature_ptr = Module._malloc(64);

            // Get a pointer to our private key
            var privateKey_ptr = _allocate(new Uint8Array(privKey));

            // Get a pointer to the message
            var message_ptr = _allocate(new Uint8Array(message));

            Module._curve25519_sign(signature_ptr, privateKey_ptr, message_ptr, message.byteLength);

            var res = new Uint8Array(64);
            _readBytes(signature_ptr, 64, res);

            Module._free(signature_ptr);
            Module._free(privateKey_ptr);
            Module._free(message_ptr);

            return res.buffer;
        },

        verify: function(pubKey, message, sig) {
            // Get a pointer to their public key
            var publicKey_ptr = _allocate(new Uint8Array(pubKey));

            // Get a pointer to the signature
            var signature_ptr = _allocate(new Uint8Array(sig));

            // Get a pointer to the message
            var message_ptr = _allocate(new Uint8Array(message));

            var res = Module._curve25519_verify(signature_ptr,
                                                publicKey_ptr,
                                                message_ptr,
                                                message.byteLength);

            Module._free(publicKey_ptr);
            Module._free(signature_ptr);
            Module._free(message_ptr);

            if (res !== 0) {
                throw new Error("Invalid signature");
            }
        }
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    self.libsignal = self.libsignal || {};
    const ns = self.libsignal.curve = {};

    function validatePrivKey(privKey) {
        if (!privKey || !(privKey instanceof ArrayBuffer) || privKey.byteLength != 32) {
            throw new Error("Invalid private key");
        }
    }

    function scrubPubKeyFormat(pubKey) {
        if (!(pubKey instanceof ArrayBuffer)) {
            throw new TypeError("ArrayBuffer required");
        }
        if ((pubKey.byteLength !== 33 || new Uint8Array(pubKey)[0] !== 5) &&
             pubKey.byteLength !== 32) {
            throw new Error("Invalid public key");
        }
        if (pubKey.byteLength === 33) {
            return pubKey.slice(1);
        } else {
            console.error("WARNING: Expected pubkey of length 33");
            return pubKey;
        }
    }

    ns.createKeyPair = function(privKey) {
        validatePrivKey(privKey);
        const keys = libsignal.curve25519.keyPair(privKey);
        // prepenprependd version byte
        const origPub = new Uint8Array(keys.pubKey);
        const pub = new Uint8Array(33);
        pub.set(origPub, 1);
        pub[0] = 5;
        return {
            pubKey: pub.buffer,
            privKey: keys.privKey
        };

    },

    ns.calculateAgreement = function(pubKey, privKey) {
        pubKey = scrubPubKeyFormat(pubKey);
        validatePrivKey(privKey);
        if (!pubKey || pubKey.byteLength !== 32) {
            throw new Error("Invalid public key");
        }
        return libsignal.curve25519.sharedSecret(pubKey, privKey);
    };

    ns.calculateSignature = function(privKey, message) {
        validatePrivKey(privKey);
        if (!message) {
            throw new Error("Invalid message");
        }
        return libsignal.curve25519.sign(privKey, message);
    };

    ns.verifySignature = function(pubKey, msg, sig) {
        pubKey = scrubPubKeyFormat(pubKey);
        if (!pubKey || pubKey.byteLength !== 32) {
            throw new Error("Invalid public key");
        }
        if (!msg) {
            throw new Error("Invalid message");
        }
        if (!sig || sig.byteLength !== 64) {
            throw new Error("Invalid signature");
        }
        libsignal.curve25519.verify(pubKey, msg, sig);
    };

    ns.generateKeyPair = function() {
        var privKey = libsignal.crypto.getRandomBytes(32);
        return ns.createKeyPair(privKey);
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    self.libsignal = self.libsignal || {};
    const ns = self.libsignal.crypto = {};
    const subtle = self.crypto && self.crypto.subtle;

    ns.getRandomBytes = function(size) {
        const array = new Uint8Array(size);
        crypto.getRandomValues(array);
        return array.buffer;
    };

    ns.encrypt = async function(keyData, data, iv) {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be ArrayBuffer");
        }
        const key = await subtle.importKey('raw', keyData, {name: 'AES-CBC'}, false, ['encrypt']);
        return await subtle.encrypt({name: 'AES-CBC', iv: new Uint8Array(iv)}, key, data);
    };

    ns.decrypt = async function(keyData, data, iv) {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be ArrayBuffer");
        }
        const key = await subtle.importKey('raw', keyData, {name: 'AES-CBC'}, false, ['decrypt']);
        return await subtle.decrypt({name: 'AES-CBC', iv: new Uint8Array(iv)}, key, data);
    };

    ns.calculateMAC = async function(keyData, data) {
        if (!(keyData instanceof ArrayBuffer)) {
            throw new TypeError("keyData must be ArrayBuffer");
        }
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be ArrayBuffer");
        }
        const key = await subtle.importKey('raw', keyData, {
            name: 'HMAC',
            hash: {name: 'SHA-256'}
        }, false, ['sign']);
        return await subtle.sign({name: 'HMAC', hash: 'SHA-256'}, key, data);
    };

    ns.hash = async function(data) {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be ArrayBuffer");
        }
        return await subtle.digest({name: 'SHA-512'}, data);
    };

    ns.deriveSecrets = async function(input, salt, info, chunks) {
        // Specific implementation of RFC 5869 that only returns the first 3 32-byte chunks
        if (!(input instanceof ArrayBuffer) ||
            !(salt instanceof ArrayBuffer) ||
            !(info instanceof ArrayBuffer)) {
            throw new TypeError('ArrayBuffer types required');
        }
        chunks = chunks || 3;
        console.assert(chunks >= 1 && chunks <= 3);
        const PRK = await ns.calculateMAC(salt, input);
        const infoBuffer = new ArrayBuffer(info.byteLength + 1 + 32);
        const infoArray = new Uint8Array(infoBuffer);
        infoArray.set(new Uint8Array(info), 32);
        infoArray[infoArray.length - 1] = 1;
        const signed = [await ns.calculateMAC(PRK, infoBuffer.slice(32))];
        if (chunks > 1) {
            infoArray.set(new Uint8Array(signed[signed.length - 1]));
            infoArray[infoArray.length - 1] = 2;
            signed.push(await ns.calculateMAC(PRK, infoBuffer));
        }
        if (chunks > 2) {
            infoArray.set(new Uint8Array(signed[signed.length - 1]));
            infoArray[infoArray.length - 1] = 3;
            signed.push(await ns.calculateMAC(PRK, infoBuffer));
        }
        return signed;
    };

    ns.verifyMAC = async function(data, key, mac, length) {
        const calculatedMac = await ns.calculateMAC(key, data);
        if (mac.byteLength != length  || calculatedMac.byteLength < length) {
            throw new Error("Bad MAC length");
        }
        const a = new Uint8Array(calculatedMac);
        const b = new Uint8Array(mac);
        let result = 0;
        for (let i = 0; i < mac.byteLength; ++i) {
            result = result | (a[i] ^ b[i]);
        }
        if (result !== 0) {
            throw new Error("Bad MAC");
        }
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    self.libsignal = self.libsignal || {};
    const ns = self.libsignal.util = {};
    
    var StaticArrayBufferProto = new ArrayBuffer().__proto__;

    ns.toString = function(thing) {
        console.warn("DEPRECATED toString.  Use bytesToString() instead");
        if (typeof thing == 'string') {
            return thing;
        }
        return new dcodeIO.ByteBuffer.wrap(thing).toString('binary');
    };

    ns.toArrayBuffer = function(thing) {
        console.warn("DEPRECATED toArrayBuffer.  Use stringToBytes() instead");
        debugger;
        if (thing === undefined) {
            return undefined;
        }
        if (thing === Object(thing)) {
            if (thing.__proto__ == StaticArrayBufferProto) {
                return thing;
            }
        }

        if (typeof thing !== "string") {
            throw new Error("Tried to convert a non-string of type " + typeof thing + " to an array buffer");
        }
        return new dcodeIO.ByteBuffer.wrap(thing, 'binary').toArrayBuffer();
    };

    ns.stringToBytes = function(data) {
        // Note this expects the string encoding to be 8 bits per char point, not 16.
        if (typeof data !== 'string') {
            throw new TypeError("string argument required");
        }
        // Optimized for V8...
        const bytes = new Array(data.length);
        for (let i = 0, len = data.length; i < len; i++) {
            bytes[i] = data.charCodeAt(i);
        }
        return new Uint8Array(bytes);
    };

    ns.stringToArrayBuffer = function(data) {
        return ns.stringToBytes(data).buffer;
    };

    ns.bytesToString = function(data) {
        // Note this translates the data into 8 bits per char point, not 16.
        if (!(data instanceof Uint8Array)) {
            throw new TypeError("Uint8Array argument required");
        }
        const len = data.length;
        if (len < 65536) {
            return String.fromCharCode.apply(null, data);
        }
        // Avoid RangeError for big values...
        const buf = [];
        for (let i = 0; i < data.length; i++) {
            buf.push(String.fromCharCode(data[i]));
        }
        return buf.join('');
    };

    ns.arrayBufferToString = function(data) {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("ArrayBuffer argument required");
        }
        return ns.bytesToString(new Uint8Array(data));
    };

    ns.bytesToHex = function(data) {
        if (!(data instanceof Uint8Array)) {
            throw new TypeError("data must be Uint8Array");
        }
        const bytes = new Uint8Array(data);
        const digits = new Array(bytes.length);
        for (const x of bytes) {
            digits.push(x.toString(16).padStart(2, '0'));
        }
        return digits.join('');
    };

    ns.arrayBufferToHex = function(data) {
        if (!(data instanceof ArrayBuffer)) {
            throw new TypeError("data must be ArrayBuffer");
        }
        return ns.bytesToHex(new Uint8Array(data));
    };

    ns.stringToHex = function(data) {
        if (typeof data !== 'string') {
            throw new TypeError("data must be String");
        }
        return ns.bytesToHex(libsignal.util.stringToBytes(data));
    };

    ns.hexToBytes = function(data) {
        if (typeof data !== 'string') {
            throw new TypeError("data must be string");
        }
        if (data.length < 2 || data.length % 2) {
            throw new TypeError("Invalid hex string (wrong padding)");
        }
        const uints = [];
        for (let i = 0; i < data.length; i += 2) {
            uints.push(parseInt(data.slice(i, i + 2), 16));
        }
        return new Uint8Array(uints);
    };

    ns.hexToArrayBuffer = function(data) {
        return ns.hexToBytes(data).buffer;
    };

    ns.isEqual = function(a, b) {
        // TODO: Special-case arraybuffers, etc
        if (a === undefined || b === undefined) {
            return false;
        }
        a = ns.toString(a);
        b = ns.toString(b);
        var maxLength = Math.max(a.length, b.length);
        if (maxLength < 5) {
            throw new Error("a/b compare too short");
        }
        return a.substring(0, Math.min(maxLength, a.length)) == b.substring(0, Math.min(maxLength, b.length));
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    self.libsignal = self.libsignal || {};
    const ns = self.libsignal.keyhelper = {};

    function isNonNegativeInteger(n) {
        return (typeof n === 'number' && (n % 1) === 0  && n >= 0);
    }

    ns.generateIdentityKeyPair = libsignal.curve.generateKeyPair;

    ns.generateRegistrationId = function() {
        var registrationId = new Uint16Array(libsignal.crypto.getRandomBytes(2))[0];
        return registrationId & 0x3fff;
    };

    ns.generateSignedPreKey = function(identityKeyPair, keyId) {
        if (!(identityKeyPair.privKey instanceof ArrayBuffer) ||
            identityKeyPair.privKey.byteLength != 32 ||
            !(identityKeyPair.pubKey instanceof ArrayBuffer) ||
            identityKeyPair.pubKey.byteLength != 33) {
            throw new TypeError('Invalid argument for identityKeyPair');
        }
        if (!isNonNegativeInteger(keyId)) {
            throw new TypeError('Invalid argument for keyId: ' + keyId);
        }
        const keyPair = libsignal.curve.generateKeyPair();
        const signature = libsignal.curve.calculateSignature(identityKeyPair.privKey, keyPair.pubKey);
        return {
            keyId,
            keyPair,
            signature
        };
    };

    ns.generatePreKey = function(keyId) {
        if (!isNonNegativeInteger(keyId)) {
            throw new TypeError('Invalid argument for keyId: ' + keyId);
        }
        const keyPair = libsignal.curve.generateKeyPair();
        return {
            keyId,
            keyPair
        };
    };
})();

self.libsignal = self.libsignal || {};
self.libsignal.protoText = function() {
	const protoText = {};

	protoText['protos/WhisperTextProtocol.proto'] = 
		'package textsecure;\n' +
		'option java_package = "org.whispersystems.libsignal.protocol";\n' +
		'option java_outer_classname = "WhisperProtos";\n' +
		'message WhisperMessage {\n' +
		'  optional bytes  ephemeralKey    = 1;\n' +
		'  optional uint32 counter         = 2;\n' +
		'  optional uint32 previousCounter = 3;\n' +
		'  optional bytes  ciphertext      = 4; // PushMessageContent\n' +
		'}\n' +
		'message PreKeyWhisperMessage {\n' +
		'  optional uint32 registrationId = 5;\n' +
		'  optional uint32 preKeyId       = 1;\n' +
		'  optional uint32 signedPreKeyId = 6;\n' +
		'  optional bytes  baseKey        = 2;\n' +
		'  optional bytes  identityKey    = 3;\n' +
		'  optional bytes  message        = 4; // WhisperMessage\n' +
		'}\n' +
		'message KeyExchangeMessage {\n' +
		'  optional uint32 id               = 1;\n' +
		'  optional bytes  baseKey          = 2;\n' +
		'  optional bytes  ephemeralKey     = 3;\n' +
		'  optional bytes  identityKey      = 4;\n' +
		'  optional bytes  baseKeySignature = 5;\n' +
		'}\n' +
''	;

	return protoText;
}();
// vim: ts=4:sw=4:expandtab

// TODO fix
/*
(function() {
    'use strict';

    self.libsignal = self.libsignal || {};
    const ns = self.libsignal.protobuf = {};

    function loadProtoBufs(filename) {
        return dcodeIO.ProtoBuf.loadProto(libsignal.protoText['protos/' + filename]).build('textsecure');
    }

    const protocolMessages = loadProtoBufs('WhisperTextProtocol.proto');
    ns.WhisperMessage = protocolMessages.WhisperMessage;
    ns.PreKeyWhisperMessage = protocolMessages.PreKeyWhisperMessage;
})();
*/
// vim: ts=4:sw=4

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    ns.BaseKeyType = {
        OURS: 1,
        THEIRS: 2
    };

    ns.ChainType = {
        SENDING: 1,
        RECEIVING: 2
    };

    const CLOSED_SESSIONS_MAX = 40;
    const SESSION_RECORD_VERSION = 'v2';

    const migrations = [{
        version: 'v1',
        migrate: function(data) {
            const sessions = data.sessions;
            if (data.registrationId) {
                for (const key in sessions) {
                    if (!sessions[key].registrationId) {
                        sessions[key].registrationId = data.registrationId;
                    }
                }
            } else {
                for (const key in sessions) {
                    if (sessions[key].indexInfo.closed === -1) {
                        console.error('V1 session storage migration error: registrationId',
                            data.registrationId, 'for open session version',
                            data.version);
                    }
                }
            }
        }
    }, {
        version: 'v2',
        migrate: function(data) {
            const s2ab = ns.util.stringToArrayBuffer;
            const sessions = new Map();  // Note: Map not ArrayBufferMap to emulate storage.
            for (const key of Object.keys(data.sessions)) {
                const sessionKey = s2ab(key);
                if (sessionKey.byteLength != 33) {
                    console.error("Unexpected session key!", key);
                    debugger;
                    continue;
                }
                const v1 = data.sessions[key];
                const v2 = {};

                v2.currentRatchet = {
                    ephemeralKeyPair: {
                        privKey: s2ab(v1.currentRatchet.ephemeralKeyPair.privKey),
                        pubKey: s2ab(v1.currentRatchet.ephemeralKeyPair.pubKey),
                    },
                    lastRemoteEphemeralKey: s2ab(v1.currentRatchet.lastRemoteEphemeralKey),
                    previousCounter: v1.currentRatchet.previousCounter,
                    rootKey: s2ab(v1.currentRatchet.rootKey)
                };
                delete v1.currentRatchet;

                v2.indexInfo = {
                    baseKey: s2ab(v1.indexInfo.baseKey),
                    baseKeyType: v1.indexInfo.baseKeyType,
                    closed: v1.indexInfo.closed,
                    remoteIdentityKey: s2ab(v1.indexInfo.remoteIdentityKey)
                };
                delete v1.indexInfo;

                delete v1.oldRatchetList;  // never used.

                if (v1.pendingPreKey) {
                    v2.pendingPreKey = {
                        baseKey: s2ab(v1.pendingPreKey.baseKey),
                        preKeyId: v1.pendingPreKey.preKeyId,
                        signedKeyId: v1.pendingPreKey.signedKeyId,
                    };
                }
                delete v1.pendingPreKey;

                v2.registrationId = v1.registrationId;
                delete v1.registrationId;

                // All remaining keys on the v1 should be chains...
                v2.chains = new Map();  // Note: Map not ArrayBufferMap to emulate storage.
                for (const x of Object.keys(v1)) {
                    const chainKey = ns.util.stringToArrayBuffer(x);
                    if (chainKey.byteLength != 33) {
                        console.error("Unexpected chain key!", x);
                        debugger;
                        continue;
                    }
                    const v1Chain = v1[x];
                    v2.chains.set(ns.util.arrayBufferToHex(chainKey), {
                        chainKey: {
                            counter: v1Chain.chainKey.counter,
                            key: v1Chain.chainKey.key && s2ab(v1Chain.chainKey.key),
                        },
                        chainType: v1Chain.chainType,
                        messageKeys: new Map(Array.from(Object.entries(v1Chain.messageKeys)).map(x =>
                            [x[0], s2ab(x[1])]))
                    });
                }

                sessions.set(ns.util.arrayBufferToHex(sessionKey), v2);
            }
            data.sessions = sessions;
        }
    }];

    function migrate(data) {
        let head = 0;
        if (data.version) {
            head = migrations.findIndex(x => x.version === data.version) + 1;
            if (!head) {
                console.error("Migrating from unknown session version:", data.version);
            }
        }
        for (const x of migrations.slice(head)) {
            console.warn(`Migrating session: ${data.version} -> ${x.version}`);
            x.migrate(data);
        }
    }


    ns.ArrayBufferMap = class ArrayBufferMap extends Map {

        static fromStorage(data) {
            if (data instanceof this) {
                return data;
            }
            if (data.constructor !== Map) {
                throw new TypeError("Map required");
            }
            const instance = new this();
            for (const x of data.entries()) {
                Map.prototype.set.call(instance, x[0], x[1]);
            }
            return instance;
        }

        encodeKey(key) {
            if (!(key instanceof ArrayBuffer)) {
                throw new TypeError("ArrayBuffer required");
            }
            return ns.util.arrayBufferToHex(key);
        }

        decodeKey(encoded) {
            if (typeof encoded !== 'string') {
                throw new TypeError("string required");
            }
            return ns.util.hexToArrayBuffer(encoded);
        }

        has(key) {
            return super.has(this.encodeKey(key));
        }

        get(key) {
            return super.get(this.encodeKey(key));
        }

        set(key, value) {
            return super.set(this.encodeKey(key), value);
        }

        delete(key) {
            return super.delete(this.encodeKey(key));
        }

        *keys() {
            for (const k of super.keys()) {
                yield this.decodeKey(k);
            }
        }

        *entries() {
            for (const x of super.entries()) {
                yield [this.decodeKey(x[0]), x[1]];
            }
        }
    };


    ns.SessionRecord = class SessionRecord {

        constructor(sessions) {
            if (sessions) {
                if (!(sessions instanceof ns.ArrayBufferMap)) {
                    throw new TypeError("ArrayBufferMap required");
                }
            } else {
                sessions = new ns.ArrayBufferMap();
            }
            this.sessions = sessions;
            this.version = SESSION_RECORD_VERSION;
        }

        static fromStorage(data) {
            // Parse structured data from storage engine into typed values.
            if (!data) {
                return new this();
            }
            if (data instanceof this) {
                return data;
            }
            if (typeof data === 'string') {
                console.warn("Loading legacy session");
                data = JSON.parse(data);
            }
            if (data.version !== SESSION_RECORD_VERSION) {
                migrate(data);
            }
            for (const session of data.sessions.values()) {
                session.chains = ns.ArrayBufferMap.fromStorage(session.chains);
            }
            return new this(ns.ArrayBufferMap.fromStorage(data.sessions));
        }

        haveOpenSession() {
            var openSession = this.getOpenSession();
            return (!!openSession && typeof openSession.registrationId === 'number');
        }

        getSession(key) {
            const session = this.sessions.get(key);
            if (session && session.indexInfo.baseKeyType === ns.BaseKeyType.OURS) {
                throw new Error("Tried to lookup a session using our basekey");
            }
            return session;
        }

        getOpenSession() {
            for (const session of this.sessions.values()) {
                if (!this.isClosed(session)) {
                    return session;
                }
            }
        }

        setSession(session) {
            this.sessions.set(session.indexInfo.baseKey, session);
        }

        getSessions() {
            // Return sessions ordered with most recently used first.
            return Array.from(this.sessions.values()).sort((a, b) => {
                const aUsed = a.indexInfo.used || 0;
                const bUsed = b.indexInfo.used || 0;
                return aUsed === bUsed ? 0 : aUsed < bUsed ? 1 : -1;
            });
        }

        closeSession(session) {
            if (this.isClosed(session)) {
                console.warn("Session already closed", session);
                return;
            }
            console.info("Closing session:", session);
            session.indexInfo.closed = Date.now();
        }

        openSession(session) {
            if (!this.isClosed(session)) {
                console.warn("Session already open");
            }
            console.info("Opening session:", session);
            session.indexInfo.closed = -1;
        }

        isClosed(session) {
            return session.indexInfo.closed !== -1;
        }

        removeOldSessions() {
            while (this.sessions.size > CLOSED_SESSIONS_MAX) {
                let oldestKey;
                let oldestSession;
                for (const x of this.sessions.entries()) {
                    const key = x[0];
                    const session = x[1];
                    if (session.indexInfo.closed !== -1 &&
                        (!oldestSession || session.indexInfo.closed < oldestSession.indexInfo.closed)) {
                        oldestKey = key;
                        oldestSession = session;
                    }
                }
                if (oldestKey) {
                    console.info("Removing old closed session:", oldestSession);
                    this.sessions.delete(oldestKey);
                } else {
                    throw new Error('Corrupt session map');
                }
            }
        }

        deleteAllSessions() {
            this.sessions.clear();
        }
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    ns.ProtocolAddress = class ProtocolAddress {

        static from(encodedAddress) {
            if (typeof encodedAddress !== 'string' || !encodedAddress.match(/.*\.\d+/)) {
                throw new Error('Invalid address encoding');
            }
            const parts = encodedAddress.split('.');
            return new this(parts[0], parseInt(parts[1]));
        }

        constructor(id, deviceId) {
            if (typeof id !== 'string') {
                throw new TypeError('id required for addr');
            }
            if (id.indexOf('.') !== -1) {
                throw new TypeError('encoded addr detected');
            }
            this.id = id;
            if (typeof deviceId !== 'number') {
                throw new TypeError('number required for deviceId');
            }
            this.deviceId = deviceId;
        }

        toString() {
            return `${this.id}.${this.deviceId}`;
        }

        is(other) {
            if (!(other instanceof ns.ProtocolAddress)) {
                return false;
            }
            return other.id === this.id && other.deviceId === this.deviceId;
        }
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    const whisperText = ns.util.stringToArrayBuffer("WhisperText");
    const whisperRatchet = ns.util.stringToArrayBuffer("WhisperRatchet");


    ns.SessionBuilder = class SessionBuilder {

        constructor(storage, protocolAddress) {
            this.addr = protocolAddress;
            this.storage = storage;
        }

        async initOutgoing(device) {
            const fqAddr = this.addr.toString();
            return await ns.queueJob(fqAddr, async () => {
                if (!await this.storage.isTrustedIdentity(this.addr.id, device.identityKey)) {
                    throw new ns.UntrustedIdentityKeyError(this.addr.id, device.identityKey);
                }
                ns.curve.verifySignature(device.identityKey, device.signedPreKey.publicKey,
                                         device.signedPreKey.signature);
                const baseKey = ns.curve.generateKeyPair();
                const devicePreKey = device.preKey && device.preKey.publicKey;
                const session = await this.initSession(true, baseKey, undefined, device.identityKey,
                                                       devicePreKey, device.signedPreKey.publicKey,
                                                       device.registrationId);
                session.pendingPreKey = {
                    signedKeyId: device.signedPreKey.keyId,
                    baseKey: baseKey.pubKey
                };
                if (device.preKey) {
                    session.pendingPreKey.preKeyId = device.preKey.keyId;
                }
                const data = await this.storage.loadSession(fqAddr);
                const record = ns.SessionRecord.fromStorage(data);
                const openSession = record.getOpenSession();
                if (openSession) {
                    console.warn("Closing stale open session for new outgoing prekey bundle");
                    record.closeSession(openSession);
                }
                record.setSession(session);
                await this.storage.storeSession(fqAddr, record);
            });
        }

        async initIncoming(record, message) {
            const msgIdentityKey = message.identityKey.toArrayBuffer();
            if (!await this.storage.isTrustedIdentity(this.addr.id, msgIdentityKey)) {
                throw new ns.UntrustedIdentityKeyError(this.addr.id, msgIdentityKey);
            }
            const baseKey = message.baseKey.toArrayBuffer();
            if (record.getSession(baseKey)) {
                // This just means we haven't replied.
                return;
            }
            const preKeyPair = await this.storage.loadPreKey(message.preKeyId);
            if (message.preKeyId && !preKeyPair) {
                throw new ns.PreKeyError('Invalid PreKey ID');
            }
            const signedPreKeyPair = await this.storage.loadSignedPreKey(message.signedPreKeyId);
            if (!signedPreKeyPair) {
                throw new ns.PreKeyError("Missing SignedPreKey");
            }
            const existingOpenSession = record.getOpenSession();
            if (existingOpenSession) {
                console.warn("Closing open session in favor of incoming prekey bundle");
                record.closeSession(existingOpenSession);
            }
            record.setSession(await this.initSession(false, preKeyPair, signedPreKeyPair,
                                                     msgIdentityKey, baseKey, undefined,
                                                     message.registrationId));
            return message.preKeyId;
        }

        async initSession(isInitiator, ourEphemeralKey, ourSignedKey, theirIdentityPubKey,
                          theirEphemeralPubKey, theirSignedPubKey, registrationId) {
            if (isInitiator) {
                if (ourSignedKey) {
                    throw new Error("Invalid call to initSession");
                }
                ourSignedKey = ourEphemeralKey;
            } else {
                if (theirSignedPubKey) {
                    throw new Error("Invalid call to initSession");
                }
                theirSignedPubKey = theirEphemeralPubKey;
            }
            let sharedSecret;
            if (!ourEphemeralKey || !theirEphemeralPubKey) {
                sharedSecret = new Uint8Array(32 * 4);
            } else {
                sharedSecret = new Uint8Array(32 * 5);
            }
            for (let i = 0; i < 32; i++) {
                sharedSecret[i] = 0xff;
            }
            const ourIdentityKey = await this.storage.getIdentityKeyPair();
            const ecRes = [
                ns.curve.calculateAgreement(theirSignedPubKey, ourIdentityKey.privKey),
                ns.curve.calculateAgreement(theirIdentityPubKey, ourSignedKey.privKey),
                ns.curve.calculateAgreement(theirSignedPubKey, ourSignedKey.privKey)
            ];
            if (isInitiator) {
                sharedSecret.set(new Uint8Array(ecRes[0]), 32);
                sharedSecret.set(new Uint8Array(ecRes[1]), 32 * 2);
            } else {
                sharedSecret.set(new Uint8Array(ecRes[0]), 32 * 2);
                sharedSecret.set(new Uint8Array(ecRes[1]), 32);
            }
            sharedSecret.set(new Uint8Array(ecRes[2]), 32 * 3);
            if (ourEphemeralKey && theirEphemeralPubKey) {
                const ecRes4 = ns.curve.calculateAgreement(theirEphemeralPubKey,
                                                           ourEphemeralKey.privKey);
                sharedSecret.set(new Uint8Array(ecRes4), 32 * 4);
            }
            const masterKey = await ns.crypto.deriveSecrets(sharedSecret.buffer, new ArrayBuffer(32),
                                                            whisperText);
            const session = {
                registrationId,
                currentRatchet: {
                    rootKey: masterKey[0],
                    ephemeralKeyPair: isInitiator ? ns.curve.generateKeyPair() : ourSignedKey,
                    lastRemoteEphemeralKey: theirSignedPubKey,
                    previousCounter: 0
                },
                indexInfo: {
                    created: Date.now(),
                    used: Date.now(),
                    remoteIdentityKey: theirIdentityPubKey,
                    baseKey: isInitiator ? ourEphemeralKey.pubKey : theirEphemeralPubKey,
                    baseKeyType: isInitiator ? ns.BaseKeyType.OURS : ns.BaseKeyType.THEIRS,
                    closed: -1
                },
                chains: new ns.ArrayBufferMap()
            };
            if (isInitiator) {
                // If we're initiating we go ahead and set our first sending ephemeral key now,
                // otherwise we figure it out when we first maybeStepRatchet with the remote's
                // ephemeral key
                await this.calculateSendingRatchet(session, theirSignedPubKey);
            }
            console.info((isInitiator ? "Created" : "Imported") + " new session:", session);
            return session;
        }

        async calculateSendingRatchet(session, remoteKey) {
            const ratchet = session.currentRatchet;
            const sharedSecret = ns.curve.calculateAgreement(remoteKey, ratchet.ephemeralKeyPair.privKey);
            const masterKey = await ns.crypto.deriveSecrets(sharedSecret, ratchet.rootKey, whisperRatchet);
            session.chains.set(ratchet.ephemeralKeyPair.pubKey, {
                messageKeys: new Map(),
                chainKey: {
                    counter: -1,
                    key: masterKey[1]
                },
                chainType: ns.ChainType.SENDING
            });
            ratchet.rootKey = masterKey[0];
        }
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';
    
    const ns = self.libsignal = self.libsignal || {};

    const whisperMessageKeys = ns.util.stringToArrayBuffer("WhisperMessageKeys");
    const whisperRatchet = ns.util.stringToArrayBuffer("WhisperRatchet");

    ns.SessionCipher = class SessionCipher {

        constructor(storage, protocolAddress) {
            if (!(protocolAddress instanceof libsignal.ProtocolAddress)) {
                throw new TypeError("protocolAddress must be a ProtocolAddress");
            }
            this.addr = protocolAddress;
            this.storage = storage;
        }

        toString() {
            return `<SessionCipher(${this.addr.toString()})>`;
        }

        async getRecord() {
            const data = await this.storage.loadSession(this.addr.toString());
            return data && ns.SessionRecord.fromStorage(data);
        }

        async storeRecord(record) {
            record.removeOldSessions();
            await this.storage.storeSession(this.addr.toString(), record);
        }

        async queueJob(awaitable) {
            return await ns.queueJob(this.addr.toString(), awaitable);
        }

        async encrypt(data) {
            if (!(data instanceof ArrayBuffer)) {
                throw new TypeError("ArrayBuffer required");
            }
            const ourIdentityKey = await this.storage.getIdentityKeyPair();
            return await this.queueJob(async () => {
                const record = await this.getRecord();
                if (!record) {
                    throw new ns.SessionError("No sessions");
                }
                const session = record.getOpenSession();
                if (!session) {
                    throw new ns.SessionError("No open session");
                }
                const remoteIdentityKey = session.indexInfo.remoteIdentityKey;
                if (!await this.storage.isTrustedIdentity(this.addr.id, remoteIdentityKey)) {
                    throw new ns.UntrustedIdentityKeyError(this.addr.id, remoteIdentityKey);
                }
                const chain = session.chains.get(session.currentRatchet.ephemeralKeyPair.pubKey);
                if (chain.chainType === ns.ChainType.RECEIVING) {
                    throw new TypeError("Tried to encrypt on a receiving chain");
                }
                await this.fillMessageKeys(chain, chain.chainKey.counter + 1);
                const keys = await ns.crypto.deriveSecrets(chain.messageKeys.get(chain.chainKey.counter),
                                                           new ArrayBuffer(32), whisperMessageKeys);
                chain.messageKeys.delete(chain.chainKey.counter);
                const msg = new ns.protobuf.WhisperMessage();
                msg.ephemeralKey = session.currentRatchet.ephemeralKeyPair.pubKey;
                msg.counter = chain.chainKey.counter;
                msg.previousCounter = session.currentRatchet.previousCounter;
                msg.ciphertext = await ns.crypto.encrypt(keys[0], data, keys[2].slice(0, 16));
                const msgBytes = new Uint8Array(msg.toArrayBuffer());
                const macInput = new Uint8Array(msgBytes.length + (33 * 2) + 1);
                macInput.set(new Uint8Array(ourIdentityKey.pubKey));
                macInput.set(new Uint8Array(remoteIdentityKey), 33);
                macInput[33 * 2] = (3 << 4) | 3;
                macInput.set(msgBytes, (33 * 2) + 1);
                const mac = await ns.crypto.calculateMAC(keys[1], macInput.buffer);
                const result = new Uint8Array(msgBytes.length + 9);
                result[0] = (3 << 4) | 3;
                result.set(msgBytes, 1);
                result.set(new Uint8Array(mac, 0, 8), msgBytes.length + 1);
                await this.storeRecord(record);
                let type, body;
                if (session.pendingPreKey) {
                    type = 3;  // prekey bundle
                    const preKeyMsg = new ns.protobuf.PreKeyWhisperMessage();
                    preKeyMsg.identityKey = ourIdentityKey.pubKey;
                    preKeyMsg.registrationId = await this.storage.getLocalRegistrationId();
                    preKeyMsg.baseKey = session.pendingPreKey.baseKey;
                    if (session.pendingPreKey.preKeyId) {
                        preKeyMsg.preKeyId = session.pendingPreKey.preKeyId;
                    }
                    preKeyMsg.signedPreKeyId = session.pendingPreKey.signedKeyId;
                    preKeyMsg.message = result;
                    const preKeyBytes = new Uint8Array(preKeyMsg.encode().toArrayBuffer());
                    body = String.fromCharCode((3 << 4) | 3) + ns.util.bytesToString(preKeyBytes);
                } else {
                    type = 1;  // normal
                    body = ns.util.bytesToString(result);
                }
                return {
                    type,
                    body,
                    registrationId: session.registrationId
                };
            });
        }

        async decryptWithSessions(data, sessions) {
            // Iterate through the sessions, attempting to decrypt using each one.
            // Stop and return the result if we get a valid result.
            if (!sessions.length) {
                throw new ns.SessionError("No sessions available");
            }
            const errors = [];
            for (const session of sessions) {
                let plaintext;
                try {
                    plaintext = await this.doDecryptWhisperMessage(data, session);
                    session.indexInfo.used = Date.now();
                    return {
                        session,
                        plaintext
                    };
                } catch(e) {
                    errors.push(e);
                }
            }
            console.error("Failed to decrypt message with any known session...");
            for (const e of errors) {
                console.error("Session error:" + e, e.stack);
            }
            throw new ns.SessionError("No matching sessions found for message", {decryptErrors: errors});
        }

        async decryptWhisperMessage(data) {
            return await this.queueJob(async () => {
                const record = await this.getRecord();
                if (!record) {
                    throw new ns.SessionError("No session record");
                }
                const result = await this.decryptWithSessions(data, record.getSessions());
                const remoteIdentityKey = result.session.indexInfo.remoteIdentityKey;
                if (!await this.storage.isTrustedIdentity(this.addr.id, remoteIdentityKey)) {
                    throw new ns.UntrustedIdentityKeyError(this.addr.id, remoteIdentityKey);
                }
                if (record.isClosed(result.session)) {
                    // It's possible for this to happen when processing a backlog of messages.
                    // The message was, hopefully, just sent back in a time when this session
                    // was the most current.  Simply make a note of it and continue.  If our
                    // actual open session is for reason invalid, that must be handled via
                    // a full SessionError response.
                    console.warn("Decrypted message with closed session.");
                }
                await this.storeRecord(record);
                return result.plaintext;
            });
        }

        async decryptPreKeyWhisperMessage(data) {
            if (!(data instanceof ArrayBuffer)) {
                throw new TypeError('ArrayBuffer required');
            }
            const version = (new Uint8Array(data))[0];
            if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
                throw new Error("Incompatible version number on PreKeyWhisperMessage");
            }
            return await this.queueJob(async () => {
                let record = await this.getRecord();
                const preKeyProto = ns.protobuf.PreKeyWhisperMessage.decode(data.slice(1));
                if (!record) {
                    if (preKeyProto.registrationId == null) {
                        throw new Error("No registrationId");
                    }
                    record = new ns.SessionRecord();
                }
                const builder = new libsignal.SessionBuilder(this.storage, this.addr);
                const preKeyId = await builder.initIncoming(record, preKeyProto);
                const session = record.getSession(preKeyProto.baseKey.toArrayBuffer());
                const plaintext = await this.doDecryptWhisperMessage(preKeyProto.message.toArrayBuffer(), session);
                await this.storeRecord(record);
                if (preKeyId) {
                    await this.storage.removePreKey(preKeyId);
                }
                return plaintext;
            });
        }

        async doDecryptWhisperMessage(messageBuffer, session) {
            if (!(messageBuffer instanceof ArrayBuffer)) {
                throw new TypeError("ArrayBuffer required");
            }
            if (!session) {
                throw new TypeError("session required");
            }
            const messageBytes = new Uint8Array(messageBuffer);
            const version = messageBytes[0];
            if ((version & 0xF) > 3 || (version >> 4) < 3) {  // min version > 3 or max version < 3
                throw new Error("Incompatible version number on WhisperMessage");
            }
            const messageProto = messageBytes.slice(1, -8);
            const message = ns.protobuf.WhisperMessage.decode(messageProto);
            const ephemeralKey = message.ephemeralKey.toArrayBuffer();
            await this.maybeStepRatchet(session, ephemeralKey, message.previousCounter);
            const chain = session.chains.get(ephemeralKey);
            if (chain.chainType === ns.ChainType.SENDING) {
                throw new Error("Tried to decrypt on a sending chain");
            }
            await this.fillMessageKeys(chain, message.counter);
            if (!chain.messageKeys.has(message.counter)) {
                // Most likely the message was already decrypted and we are trying to process
                // twice.  This can happen if the user restarts before the server gets an ACK.
                throw new ns.MessageCounterError('Key used already or never filled');
            }
            const messageKey = chain.messageKeys.get(message.counter);
            chain.messageKeys.delete(message.counter);
            const keys = await ns.crypto.deriveSecrets(messageKey, new ArrayBuffer(32), whisperMessageKeys);
            const ourIdentityKey = await this.storage.getIdentityKeyPair();
            const macInput = new Uint8Array(messageProto.length + (33 * 2) + 1);
            macInput.set(new Uint8Array(session.indexInfo.remoteIdentityKey));
            macInput.set(new Uint8Array(ourIdentityKey.pubKey), 33);
            macInput[33 * 2] = (3 << 4) | 3;
            macInput.set(messageProto, (33 * 2) + 1);
            // This is where we most likely fail if the session is not a match.
            // Don't misinterpret this as corruption.
            await ns.crypto.verifyMAC(macInput.buffer, keys[1], messageBytes.slice(-8).buffer, 8);
            const plaintext = await ns.crypto.decrypt(keys[0], message.ciphertext.toArrayBuffer(),
                                                      keys[2].slice(0, 16));
            delete session.pendingPreKey;
            return plaintext;
        }

        async fillMessageKeys(chain, counter) {
            if (chain.chainKey.counter >= counter) {
                return;
            }
            if (counter - chain.chainKey.counter > 2000) {
                throw new ns.SessionError('Over 2000 messages into the future!');
            }
            if (!chain.chainKey.key) {
                throw new ns.SessionError('Chain closed');
            }
            const signed = await Promise.all([
                ns.crypto.calculateMAC(chain.chainKey.key, (new Uint8Array([1])).buffer),
                ns.crypto.calculateMAC(chain.chainKey.key, (new Uint8Array([2])).buffer)
            ]);
            chain.messageKeys.set(chain.chainKey.counter + 1, signed[0]);
            chain.chainKey.key = signed[1];
            chain.chainKey.counter += 1;
            return await this.fillMessageKeys(chain, counter);
        }

        async maybeStepRatchet(session, remoteKey, previousCounter) {
            if (session.chains.has(remoteKey)) {
                return;
            }
            const ratchet = session.currentRatchet;
            let previousRatchet = session.chains.get(ratchet.lastRemoteEphemeralKey);
            if (previousRatchet) {
                await this.fillMessageKeys(previousRatchet, previousCounter);
                delete previousRatchet.chainKey.key;  // Close
            }
            await this.calculateRatchet(session, remoteKey, false);
            // Now swap the ephemeral key and calculate the new sending chain
            const chainId = ratchet.ephemeralKeyPair.pubKey;
            if (session.chains.has(chainId)) {
                ratchet.previousCounter = session.chains.get(chainId).chainKey.counter;
                session.chains.delete(chainId);
            }
            ratchet.ephemeralKeyPair = ns.curve.generateKeyPair();
            await this.calculateRatchet(session, remoteKey, true);
            ratchet.lastRemoteEphemeralKey = remoteKey;
        }

        async calculateRatchet(session, remoteKey, sending) {
            const ratchet = session.currentRatchet;
            const sharedSecret = ns.curve.calculateAgreement(remoteKey, ratchet.ephemeralKeyPair.privKey);
            const masterKey = await ns.crypto.deriveSecrets(sharedSecret, ratchet.rootKey, whisperRatchet);
            const chainKey = sending ? ratchet.ephemeralKeyPair.pubKey : remoteKey;
            session.chains.set(chainKey, {
                messageKeys: new Map(),
                chainKey: {
                    counter: -1,
                    key: masterKey[1]
                },
                chainType: sending ? ns.ChainType.SENDING : ns.ChainType.RECEIVING
            });
            ratchet.rootKey = masterKey[0];
        }

        async hasOpenSession() {
            return await this.queueJob(async () => {
                const record = await this.getRecord();
                if (!record) {
                    return false;
                }
                return record.haveOpenSession();
            });
        }

        async closeOpenSession() {
            return await this.queueJob(async () => {
                const record = await this.getRecord();
                if (record) {
                    const openSession = record.getOpenSession();
                    if (openSession) {
                        record.closeSession(openSession);
                        await this.storeRecord(record);
                    }
                }
            });
        }
    };
})();

// vim: ts=4:sw=4:expandtab

/*
 * jobQueue manages multiple queues indexed by device to serialize
 * session io ops on the database.
 */

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    const _queueAsyncBuckets = new Map();
    const _gcLimit = 10000;

    async function _asyncQueueExecutor(queue, cleanup) {
        let offt = 0;
        while (true) {
            let limit = Math.min(queue.length, _gcLimit); // Break up thundering hurds for GC duty.
            for (let i = offt; i < limit; i++) {
                const job = queue[i];
                try {
                    job.resolve(await job.awaitable());
                } catch(e) {
                    job.reject(e);
                }
            }
            if (limit < queue.length) {
                /* Perform lazy GC of queue for faster iteration. */
                if (limit >= _gcLimit) {
                    queue.splice(0, limit);
                    offt = 0;
                } else {
                    offt = limit;
                }
            } else {
                break;
            }
        }
        cleanup();
    }

    ns.queueJob = function(bucket, awaitable) {
        /* Run the async awaitable only when all other async calls registered
         * here have completed (or thrown).  The bucket argument is a hashable
         * key representing the task queue to use. */
        if (!awaitable.name) {
            // Make debuging easier by adding a name to this function.
            Object.defineProperty(awaitable, 'name', {writable: true});
            if (typeof bucket === 'string') {
                awaitable.name = bucket;
            } else {
                console.warn("Unhandled bucket type (for naming):", typeof bucket, bucket);
            }
        }
        let inactive;
        if (!_queueAsyncBuckets.has(bucket)) {
            _queueAsyncBuckets.set(bucket, []);
            inactive = true;
        }
        const queue = _queueAsyncBuckets.get(bucket);
        const job = new Promise((resolve, reject) => queue.push({
            awaitable,
            resolve,
            reject
        }));
        if (inactive) {
            /* An executor is not currently active; Start one now. */
            _asyncQueueExecutor(queue, () => _queueAsyncBuckets.delete(bucket));
        }
        return job;
    };
})();

// vim: ts=4:sw=4:expandtab

(function() {
    'use strict';

    const ns = self.libsignal = self.libsignal || {};

    var VERSION = 0;

    function iterateHash(data, key, count) {
        data = dcodeIO.ByteBuffer.concat([data, key]).toArrayBuffer();
        return ns.crypto.hash(data).then(function(result) {
            if (--count === 0) {
                return result;
            } else {
                return iterateHash(result, key, count);
            }
        });
    }

    function shortToArrayBuffer(number) {
        return new Uint16Array([number]).buffer;
    }

    function getEncodedChunk(hash, offset) {
        var chunk = ( hash[offset]   * Math.pow(2,32) +
                      hash[offset+1] * Math.pow(2,24) +
                      hash[offset+2] * Math.pow(2,16) +
                      hash[offset+3] * Math.pow(2,8) +
                      hash[offset+4] ) % 100000;
        var s = chunk.toString();
        while (s.length < 5) {
            s = '0' + s;
        }
        return s;
    }

    function getDisplayStringFor(identifier, key, iterations) {
        var bytes = dcodeIO.ByteBuffer.concat([
            shortToArrayBuffer(VERSION), key, identifier
        ]).toArrayBuffer();
        return iterateHash(bytes, key, iterations).then(function(output) {
            output = new Uint8Array(output);
            return getEncodedChunk(output, 0) +
                getEncodedChunk(output, 5) +
                getEncodedChunk(output, 10) +
                getEncodedChunk(output, 15) +
                getEncodedChunk(output, 20) +
                getEncodedChunk(output, 25);
        });
    }

    ns.FingerprintGenerator = function(iterations) {
        this.iterations = iterations;
    };

    ns.FingerprintGenerator.prototype = {
        createFor: function(localIdentifier, localIdentityKey,
                            remoteIdentifier, remoteIdentityKey) {
            if (typeof localIdentifier !== 'string' ||
                typeof remoteIdentifier !== 'string' ||
                !(localIdentityKey instanceof ArrayBuffer) ||
                !(remoteIdentityKey instanceof ArrayBuffer)) {

              throw new Error('Invalid arguments');
            }

            return Promise.all([
                getDisplayStringFor(localIdentifier, localIdentityKey, this.iterations),
                getDisplayStringFor(remoteIdentifier, remoteIdentityKey, this.iterations)
            ]).then(function(fingerprints) {
                return fingerprints.sort().join('');
            });
        }
    };
})();
