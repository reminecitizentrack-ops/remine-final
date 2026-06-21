// polyfills.js - Patch pour le bug 'colors' de debug dans React Native (Hermes)


// Patch : définit 'colors' sur le global
if (!global.colors) {
  global.colors = [0, 1, 2, 3, 4, 5, 6];
}

// Patch : intercepte Object.defineProperty pour les fonctions qui n'ont pas 'colors'
const _ObjectDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  if (prop === 'colors' && typeof obj === 'function' && !obj.colors) {
    descriptor.value = descriptor.value || [0, 1, 2, 3, 4, 5, 6];
    descriptor.writable = true;
    descriptor.configurable = true;
    descriptor.enumerable = true;
  }
  return _ObjectDefineProperty.call(Object, obj, prop, descriptor);
};

// Patch : Object.getOwnPropertyDescriptor pour les accès à .colors
const _ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
Object.getOwnPropertyDescriptor = function(obj, prop) {
  if (prop === 'colors' && typeof obj === 'function') {
    const desc = _ObjectGetOwnPropertyDescriptor.call(Object, obj, prop);
    if (!desc) {
      return {
        value: [0, 1, 2, 3, 4, 5, 6],
        writable: true,
        enumerable: true,
        configurable: true
      };
    }
  }
  return _ObjectGetOwnPropertyDescriptor.call(Object, obj, prop);
};

// Patch : Proxy sur Function.prototype pour intercepter .colors
const _FunctionPrototype = Function.prototype;
const handler = {
  get(target, prop, receiver) {
    if (prop === 'colors') {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    return Reflect.get(target, prop, receiver);
  },
  set(target, prop, value, receiver) {
    if (prop === 'colors') {
      return true; // Ignore silencieusement
    }
    return Reflect.set(target, prop, value, receiver);
  }
};

// Appliquer le proxy sur Function.prototype
try {
  Function.prototype = new Proxy(_FunctionPrototype, handler);
} catch(e) {
  // Silencieux si ça échoue
}