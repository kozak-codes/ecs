/**
 * @typedef { 'added' | 'removed' } ListenerType
 */
/**
 * @typedef { any } Component
 */
/**
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @typedef {{
 *  [ key: string ]: Component
 * } & ComponentMap} Entity
 */
/**
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @typedef { Entity<ComponentMap>[] } FilteredEntityList
 */
/**
 * @typedef { (dt: number) => void } SystemUpdateFunction
 */
/**
 * @typedef { Object } System
 * @prop {SystemUpdateFunction} [onPreFixedUpdate]
 * @prop {SystemUpdateFunction} [onFixedUpdate]
 * @prop {SystemUpdateFunction} [onPostFixedUpdate]
 * @prop {SystemUpdateFunction} [onPreUpdate]
 * @prop {SystemUpdateFunction} [onUpdate]
 * @prop {SystemUpdateFunction} [onPostUpdate]
 */
/**
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @typedef {{
 *   (this: SystemFunction, world: World<ComponentMap>) => System
 * }} SystemFunction
 * @prop {string} [name] Name of the function. Defaults to "anonymousSystem"
 */
/**
 * @typedef { Object } Listener
 */
/**
 * @typedef {{ [ key: string ]: Listener }} ListenerMap
 */
/**
 * @typedef { Object } ListenerChangeMap
 * @prop {ListenerMap} added
 * @prop {ListenerMap} removed
 */
/**
 * @typedef {{ [ filterId: string ]: FilteredEntityList }} FilterMap
 */
/**
 * @typedef { Object } DeferredRemovalMap
 * @prop {number[]} entities indexes into entities array, sorted from highest to lowest
 * @prop {string[]} components [ entity index, component name ] pairs sorted from highest to lowest
 * Stored as a string but seperated with `__@@ECS@@__`
 */
/**
 * @typedef { Object } WorldStats
 * @prop {number} entityCount
 * @prop {{ [ key: number ]: number }} componentCount key is component id, value is instance count
 * @prop {{ [ key: number ]: number }} filterInvocationCount key is filter id, value is number of times this filter was run this frame
 * @prop {{
 *   name: string;
 *   timeElapsed: number;
 *   filters: {
 *     [ key: string ]: number;
 *   };
 * }[]} systems
 * @prop {number} currentSystem the array index of the currently processed system
 *   used to determine which systems invoke queries
 * @prop {number} lastSendTime time stats were last sent (used to throttle send)
 */
/**
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @typedef { Object } World
 * @prop {Entity<Partial<ComponentMap>>[]} entities
 * @prop {FilterMap} filters
 * @prop {System[]} systems
 * @prop {ListenerChangeMap} listeners
 * @prop {DeferredRemovalMap} removals
 * @prop {WorldStats} stats
 */
/**
 * Creates a world and sends window post message with id `mreinstein/ecs-source`
 * and method `worldCreated`
 *
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @param {number} worldId ID of the world to create
 * @returns {World<ComponentMap>} created world
 */
export function createWorld<ComponentMap extends {
    [key: string]: any;
} = any>(worldId?: number): World<ComponentMap>;
/**
 * Creates an entity and adds it to the world, incrementing the entity count
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @param {World<ComponentMap>} world world where entity will be added
 * @returns {Entity<ComponentMap>} the created entity
 */
export function createEntity<ComponentMap extends {
    [key: string]: any;
} = any>(world: World<ComponentMap>): Entity<ComponentMap>;
/**
 * Adds a component to the entity
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @template {keyof ComponentMap} ComponentName
 * @param {World<ComponentMap>} world world where listener will be invoked
 * @param {Entity<ComponentMap>} entity
 * @param {ComponentName} componentName
 * @param {ComponentMap[ComponentName]} [componentData]
 * @returns {void} returns early if this is a duplicate componentName
 */
export function addComponentToEntity<ComponentMap extends {
    [key: string]: any;
} = any, ComponentName extends keyof ComponentMap>(world: World<ComponentMap>, entity: Entity<ComponentMap>, componentName: ComponentName, componentData?: ComponentMap[ComponentName]): void;
/**
 * Removes a component from the entity, optionally deferring removal
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @template {keyof ComponentMap} [ComponentName]
 * @param {World<ComponentMap>} world world where listener will be invoked
 * @param {Entity<ComponentMap> & { [ ComponentName ]: ComponentMap[ComponentName] }} entity entity to remove component from
 * @param {ComponentName} componentName name of the component to remove
 * @param {boolean} [deferredRemoval] Default is true, optionally defer removal
 * @returns {void} returns early if componentName does not exist on entity
 */
export function removeComponentFromEntity<ComponentMap extends {
    [key: string]: any;
} = any, ComponentName extends keyof ComponentMap = any>(world: World<ComponentMap>, entity: {
    [key: string]: any;
} & ComponentMap, componentName: ComponentName, deferredRemoval?: boolean): void;
/**
 * Remove an entity from the world
 * @param {World} world world to remove entity from and emit listeners
 * @param {Entity} entity entity to remove
 * @param {boolean} [deferredRemoval] Default is true, optionally defer removal
 * @returns {void} returns early if entity does not exist in world
 */
export function removeEntity(world: World, entity: Entity, deferredRemoval?: boolean): void;
/**
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @template {keyof ComponentMap} [ComponentName]
 * Get entities from the world with all provided components. Optionally,
 * @param {World<ComponentMap>} world
 * @param {ComponentName[]} componentNames A component filter used to match entities.
 * Must match all of the components in the filter.
 * Can add an exclamation mark at the beginning to query by components that are not present. For example:
 * `const entities = ECS.getEntities(world, [ 'transform', '!hero' ])`
 *
 * @param {ListenerType} [listenerType] Optional. Can be "added" or "removed". Provides a list of entities
 * that match were "added" or "removed" since the last system call which matched the filter.
 * @returns {Entity<ComponentMap>[]} an array of entities that match the given filters
 */
export function getEntities<ComponentMap extends {
    [key: string]: any;
} = any, ComponentName extends keyof ComponentMap = any>(world: World<ComponentMap>, componentNames: ComponentName[], listenerType?: ListenerType): Entity<ComponentMap>[];
/**
 * Adds a system to the world.
 * @param {World} world
 * @param {SystemFunction} fn
 */
export function addSystem(world: World, fn: SystemFunction): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function preFixedUpdate(world: World, dt: number): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function fixedUpdate(world: World, dt: number): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function postFixedUpdate(world: World, dt: number): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function preUpdate(world: World, dt: number): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function update(world: World, dt: number): void;
/**
 *
 * @param {World} world
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function postUpdate(world: World, dt: number): void;
/**
 * necessary cleanup step at the end of each frame loop
 * @param {World} world
 */
export function cleanup(world: World): void;
declare namespace _default {
    export { createWorld };
    export { createEntity };
    export { addComponentToEntity };
    export { removeComponentFromEntity };
    export { getEntities };
    export { removeEntity };
    export { addSystem };
    export { preFixedUpdate };
    export { fixedUpdate };
    export { postFixedUpdate };
    export { update };
    export { preUpdate };
    export { postUpdate };
    export { cleanup };
}
export default _default;
export type ListenerType = 'added' | 'removed';
export type Component = any;
export type Entity<ComponentMap extends {
    [key: string]: any;
} = any> = {
    [key: string]: any;
} & ComponentMap;
export type FilteredEntityList<ComponentMap extends {
    [key: string]: any;
} = any> = Entity<ComponentMap>[];
export type SystemUpdateFunction = (dt: number) => void;
export type System = {
    onPreFixedUpdate?: SystemUpdateFunction;
    onFixedUpdate?: SystemUpdateFunction;
    onPostFixedUpdate?: SystemUpdateFunction;
    onPreUpdate?: SystemUpdateFunction;
    onUpdate?: SystemUpdateFunction;
    onPostUpdate?: SystemUpdateFunction;
};
export type SystemFunction<ComponentMap extends {
    [key: string]: any;
} = any> = (this: SystemFunction, world: World<ComponentMap>) => System;
export type Listener = any;
export type ListenerMap = {
    [key: string]: any;
};
export type ListenerChangeMap = {
    added: ListenerMap;
    removed: ListenerMap;
};
export type FilterMap = {
    [filterId: string]: FilteredEntityList<any>;
};
export type DeferredRemovalMap = {
    /**
     * indexes into entities array, sorted from highest to lowest
     */
    entities: number[];
    /**
     * [ entity index, component name ] pairs sorted from highest to lowest
     * Stored as a string but seperated with `__@@ECS@@__`
     */
    components: string[];
};
export type WorldStats = {
    entityCount: number;
    /**
     * key is component id, value is instance count
     */
    componentCount: {
        [key: number]: number;
    };
    /**
     * key is filter id, value is number of times this filter was run this frame
     */
    filterInvocationCount: {
        [key: number]: number;
    };
    systems: {
        name: string;
        timeElapsed: number;
        filters: {
            [key: string]: number;
        };
    }[];
    /**
     * the array index of the currently processed system
     * used to determine which systems invoke queries
     */
    currentSystem: number;
    /**
     * time stats were last sent (used to throttle send)
     */
    lastSendTime: number;
};
export type World<ComponentMap extends {
    [key: string]: any;
} = any> = {
    entities: Entity<Partial<ComponentMap>>[];
    filters: FilterMap;
    systems: System[];
    listeners: ListenerChangeMap;
    removals: DeferredRemovalMap;
    stats: WorldStats;
};
//# sourceMappingURL=ecs.d.ts.map