// Minimal mock of fabric-contract-api to use in unit tests
export class Context { }
export class Contract { }

export function Info(_meta: any) {
    return function (_ctor: any) {
        // no-op decorator
    };
}

export function Transaction() {
    return function (_target: any, _prop?: string, _desc?: PropertyDescriptor) {
        // no-op decorator
    };
}

export function Returns(_type?: any) {
    return function (_target: any, _prop?: string, _desc?: PropertyDescriptor) {
        // no-op decorator
    };
}
