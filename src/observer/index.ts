type Key = string | symbol;
type Bucket = WeakMap<any, Map<Key, Set<Function>>>;
const bucket: Bucket = new WeakMap();

const data: Record<Key, any> = {
    ok: true,
    text: 'Hello Vue'
}

type Effect = Function & { deps: Set<Function>[] };

const cleanup = (effectFn: Effect) => {
    for (let i = 0; i < effectFn.deps.length; i++) {
        const deps = effectFn.deps[i];
        deps.delete(effectFn);
    }
    effectFn.deps.length = 0;
}


let activeEffect: Effect;

let effectStack: Effect[] = [];

export const effect = (fn: Function) => {
    const effectFn: Effect = () => {
        cleanup(effectFn);
        activeEffect = effectFn;
        effectStack.push(effectFn);
        fn();
        effectStack.pop();
        activeEffect = effectStack[effectStack.length - 1];
    }
    effectFn.deps = [];
    effectFn();
}

setTimeout(() => {
    console.log(activeEffect.deps);
}, 3000)

const track = (target: Record<Key, any>, key: Key) => {
    if (!activeEffect) {
        return target[key];
    }
    let depsMap = bucket.get(target);
    if (!depsMap) {
        bucket.set(target, depsMap = new Map());
    }
    let deps = depsMap.get(key);
    if (!deps) {
        depsMap.set(key, deps = new Set());
    }
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
}

const trigger = (target: Record<Key, any>, key: Key) => {
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    const effects = depsMap.get(key);
    // TODO:
    const effectToRun = new Set<Function>();
    effectToRun && effectToRun.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectToRun.add(effectFn);
        }
    });
    effectToRun.forEach(effectFn => effectFn())
}

export const obj = new Proxy(data, {
    get(target, key) {
        track(target, key);
        return target[key];
    },
    set(target, key, newValue) {
        target[key] = newValue;
        trigger(target, key);
        return true;
    }
})