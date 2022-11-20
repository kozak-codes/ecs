import orderedInsert from './ordered-insert.js'
import removeItems   from 'remove-array-items'


const now = (typeof performance === 'undefined') ? (() => Date.now()) : (() => performance.now())


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
export function createWorld(worldId=Math.ceil(Math.random() * 999999999) ) {
    /**
     * @type {World}
     */
    const world = {
        entities: [ ],
        filters: { },
        systems: [ ],
        listeners: {
            added: { },  // key is the filter, value is the array of entities added this frame
            removed: { } // key is the filter, value is the array of entities removed this frame
        },
        
        // deferred removals
        removals: {
            entities: [ ], // indexes into entities array, sorted from highest to lowest
            components: [ ] // [ entity index, component name ] pairs sorted from highest to lowest
        },

        stats: {
            // TODO: send world id to support multiple ecs worlds per page
            /*worldId, */
            entityCount: 0,
            componentCount: { }, // key is component id, value is instance count
            filterInvocationCount: { }, // key is filter id, value is number of times this filter was run this frame
            systems: [
                /*
                {
                    name: 'systemname',
                    timeElapsed: 0, // milliseconds spent in this system this frame
                    filters: {
                        filterId1: 0,  // number of entities that matched the filter
                        filterId2: 0,
                    }
                }
                */
            ],

            // the array index of the currently processed system
            // used to determine which systems invoke queries
            currentSystem: 0,

            lastSendTime: 0, // time stats were last sent (used to throttle send)
        }
    }

    if ((typeof window !== 'undefined') && window.__MREINSTEIN_ECS_DEVTOOLS) {
        window.postMessage({
            id: 'mreinstein/ecs-source',
            method: 'worldCreated',
            data: world.stats,
        }, '*');
    }

    return world
}

/**
 * Creates an entity and adds it to the world, incrementing the entity count
 * @template {{[ key: string ]: Component}} [ComponentMap]
 * @param {World<ComponentMap>} world world where entity will be added
 * @returns {Entity<ComponentMap>} the created entity
 */
export function createEntity (world) {
    const entity = { }
    world.entities.push(entity)
    world.stats.entityCount++
    return entity
}

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
export function addComponentToEntity (world, entity, componentName, componentData={}) {

    // ignore duplicate adds
    if (entity[componentName])
        return

    if (!Number.isInteger(world.stats.componentCount[componentName]))
        world.stats.componentCount[componentName] = 0

    if (!entity[componentName])
        world.stats.componentCount[componentName] += 1

    entity[componentName] = componentData

    // add this entity to any filters that match
    for (const filterId in world.filters) {
        const matches = _matchesFilter(filterId, entity)

        const filter = world.filters[filterId]
        const idx = filter.indexOf(entity)
        if (idx >= 0) {
            // filter already contains entity and the filter doesn't match the entity, remove it
            if (!matches)
                removeItems(filter, idx, 1)
        } else {
            // filter doesn't contain the entity yet, and it's not included yet, add it
            if (matches)
                filter.push(entity)
        }
    }

    for (const filterId in world.listeners.added) {
        const matches = _matchesFilter(filterId, entity) && !_matchesFilter(filterId, entity, [ componentName ])

        // if the entity matches the filter and isn't already in the added list, add it
        const list = world.listeners.added[filterId]
        if (matches && !list.includes(entity))
            list.push(entity)
    }
}

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
 export function removeComponentFromEntity (world, entity, componentName, deferredRemoval=true) {
    // ignore removals when the component isn't present
    if (!entity[componentName])
        return

    // get list of all remove listeners that we match
    const matchingRemoveListeners = [ ]
    for (const filterId in world.listeners.removed) {
        // if an entity matches a remove filter, but then no longer matches the filter after a component
        // is removed, it should be flagged as removed in listeners.removed
        if (_matchesFilter(filterId, entity) && !_matchesFilter(filterId, entity, [ componentName ]))
            // prevent adding the removal of an entity to the same list multiple times
            if (!world.listeners.removed[filterId].includes(entity))
                world.listeners.removed[filterId].push(entity)
    }

    if (deferredRemoval) {
        // add this component to the list of deferred removals
        const idx = world.entities.indexOf(entity)
        const removalKey = `${idx}__@@ECS@@__${componentName}`

        if (!world.removals.components.includes(removalKey))
            world.removals.components.push(removalKey)
    } else {
        _removeComponent(world, entity, componentName)
    }
}

/**
 * Remove an entity from the world
 * @param {World} world world to remove entity from and emit listeners
 * @param {Entity} entity entity to remove
 * @param {boolean} [deferredRemoval] Default is true, optionally defer removal 
 * @returns {void} returns early if entity does not exist in world
 */
 export function removeEntity (world, entity, deferredRemoval=true) {
    const idx = world.entities.indexOf(entity)
    if (idx < 0)
        return

    // add the entity to all matching remove listener lists
    for (const filterId in world.listeners.removed) {
        const matches = _matchesFilter(filterId, entity)

        // if the entity matches the filter and isn't already in the removed list, add it
        const list = world.listeners.removed[filterId]
        if (matches && !list.includes(entity))
            list.push(entity)
    }

    if (deferredRemoval) {
        // add this entity to the list of deferred removals
        if (!world.removals.entities.includes(idx)) {
            orderedInsert(world.removals.entities, idx)
            world.stats.entityCount--
        }
    } else {
        _removeEntity(world, entity)
    }

}

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
export function getEntities (world, componentNames, listenerType) {
    const filterId = componentNames.join(',')

    if (!world.filters[filterId])
        world.filters[filterId] = world.entities.filter((e) => _matchesFilter(filterId, e))

    if (!world.stats.filterInvocationCount[filterId])
        world.stats.filterInvocationCount[filterId] = 0

    world.stats.filterInvocationCount[filterId] += 1;

    const systemIdx = world.stats.currentSystem
    if (world.stats.systems[systemIdx]) {
        if (!world.stats.systems[systemIdx].filters[filterId])
            world.stats.systems[systemIdx].filters[filterId] = 0

        world.stats.systems[systemIdx].filters[filterId] += world.filters[filterId].length
    }

    if (listenerType === 'added') {
        // if the filter doesn't exist yet, add it
        if (!world.listeners.added[filterId]) {
            world.listeners.added[filterId] = [ ]
            // add all existing entities that are already matching to the added event
            for (const entity of world.entities) {
                if (_matchesFilter(filterId, entity))
                    world.listeners.added[filterId].push(entity)
            }
        }

        return world.listeners.added[filterId]
    }

    if (listenerType === 'removed') {
        // if the filter doesn't exist yet, remove it
        if (!world.listeners.removed[filterId])
            world.listeners.removed[filterId] = [ ]

        return world.listeners.removed[filterId]
    }

    return world.filters[filterId]
}


/**
 * returns true if an entity contains all the components that match the filter
 * all entities having at least one component in the ignore list are excluded.
 * @param {string} filterId 
 * @param {Entity} entity 
 * @param {string[]} componentIgnoreList 
 * @returns 
 */
function _matchesFilter (filterId, entity, componentIgnoreList=[]) {
    const componentIds = filterId.split(',')

    // if the entity lacks any components in the filter, it's not in the filter
    for (const componentId of componentIds) {
        const isIgnored = componentIgnoreList.includes(componentId)
        if (isIgnored)
            return false

        if (componentId.startsWith('!') && entity[componentId.slice(1)])
            return false

        if (!componentId.startsWith('!') && !entity[componentId])
            return false
    }

    return true
}

/**
 * Adds a system to the world.
 * @param {World} world 
 * @param {SystemFunction} fn 
 */
export function addSystem (world, fn) {
    const system = fn.call(fn, world);

    world.stats.systems.push({
        name: fn.name || 'anonymousSystem',
        timeElapsed: 0, // milliseconds spent in this system this frame
        // key is filterId, value is number of entities that matched the filter
        filters: { }
    })

    if (!system.onPreFixedUpdate)
        system.onPreFixedUpdate = function () { }

    if (!system.onFixedUpdate)
        system.onFixedUpdate = function () { }

    if (!system.onPostFixedUpdate)
        system.onPostFixedUpdate = function () { }

    if (!system.onPreUpdate)
        system.onPreUpdate = function () { }

    if (!system.onUpdate)
        system.onUpdate = function () { }

    if (!system.onPostUpdate)
        system.onPostUpdate = function () { }

    world.systems.push(system)
}

/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function preFixedUpdate (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onPreFixedUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}


/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function fixedUpdate (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onFixedUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}

/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function postFixedUpdate (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onPostFixedUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}


/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function preUpdate (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onPreUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}

/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function update (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}

/**
 * 
 * @param {World} world 
 * @param {number} dt Change in time since last update, in milliseconds
 */
export function postUpdate (world, dt) {
    for (let i=0; i < world.systems.length; i++) {
        world.stats.currentSystem = i
        const system = world.systems[i]
        const start = now()
        system.onPostUpdate(dt)
        world.stats.systems[i].timeElapsed += (now() - start)
    }
}

/**
 * remove all entities that were added/removed this frame from the listener set
 * should be called after postUpdate
 *
 * @param {World} world 
 */
function emptyListeners (world) {
    for (const filterId in world.listeners.added)
        world.listeners.added[filterId].length = 0

    for (const filterId in world.listeners.removed)
        world.listeners.removed[filterId].length = 0
}

/**
 * 
 * @param {World} world 
 */
function _resetStats (world) {
    for (const filterId in world.stats.filterInvocationCount)
        world.stats.filterInvocationCount[filterId] = 0

    for (const system of world.stats.systems) {
        system.timeElapsed = 0
        for (const filterId in system.filters)
            system.filters[filterId] = 0
    }

    world.stats.currentSystem = 0
}

/**
 * 
 * @param {World} world 
 * @param {Entity} entity 
 * @param {string} componentName 
 */
function _removeComponent (world, entity, componentName) {
    if (entity[componentName])
        world.stats.componentCount[componentName] -= 1

    delete entity[componentName]

    // remove this entity from any filters that no longer match
    for (const filterId in world.filters) {
        const filter = world.filters[filterId]

        if (_matchesFilter(filterId, entity) && !filter.includes(entity)) {
            // entity matches filter and it's not in the filter add it
            filter.push(entity)
        } else if (_hasComponent(filterId,componentName)) {
            // entity doesn't match filter and it's in the filter remove it
            // this filter contains the removed component
            const filterIdx = filter.indexOf(entity)
            if (filterIdx >= 0)
                removeItems(filter, filterIdx, 1)
        }
    }
}

/**
 * 
 * @param {World} world 
 * @param {Entity} entity 
 */
function _removeEntity (world, entity) {
    for (const componentName in entity)
        if (entity[componentName])
            world.stats.componentCount[componentName] -= 1

    const entityIdx = world.entities.indexOf(entity)
    removeItems(world.entities, entityIdx, 1)

    // update all filters that match this
    for (const filterId in world.filters) {
        const filter = world.filters[filterId]
        const idx = filter.indexOf(entity)
        if (idx >= 0)
            removeItems(filter, idx, 1)
    }
}

/**
 * purpose: by given filterId and component determine if component is referred in that filter.
 * @param {string} filterId a string in the form "component1,component2,...,componentN", component is a string
 * @param {string} component 
 * @returns {boolean}
 */
function _hasComponent (filterId, component) {
  return (filterId === component) ||
         filterId.startsWith(`${component},`) ||
         filterId.endsWith(`,${component}`) ||
         filterId.includes(`,${component},`)
}

/**
 * necessary cleanup step at the end of each frame loop
 * @param {World} world 
 */
export function cleanup (world) {
    emptyListeners(world)

    // process all entity components marked for deferred removal
    for (let i=0; i < world.removals.components.length; i++) {
        const [ entityIdx, componentName ] = world.removals.components[i].split('__@@ECS@@__')
        const entity = world.entities[entityIdx]
        _removeComponent(world, entity, componentName)
    }

    world.removals.components.length = 0

    // process all entities marked for deferred removal
    for (const entityIdx of world.removals.entities) {
        const entity = world.entities[entityIdx]
        _removeEntity(world, entity)
    }

    world.removals.entities.length = 0

    if ((typeof window !== 'undefined') && window.__MREINSTEIN_ECS_DEVTOOLS) {
        // running at 60fps seems to queue up a lot of messages. I'm thinking it might just be more
        // data than postMessage can send. capping it at some lower update rate seems to work better.
        // for now capping this at 4fps. later we might investigate if sending deltas over postmessage
        // solves the message piling up problem.
        if (performance.now() - world.stats.lastSendTime > 250) {
            world.stats.lastSendTime = performance.now();
            window.postMessage({
                id: 'mreinstein/ecs-source',
                method: 'refreshData',
                data: world.stats,
            }, '*');
        }
    }

    setTimeout(_resetStats, 0, world) // defer reset until next frame
}


export default {
    createWorld,
    createEntity,
    addComponentToEntity,
    removeComponentFromEntity,
    getEntities,
    removeEntity,
    addSystem,
    preFixedUpdate,
    fixedUpdate,
    postFixedUpdate,
    update,
    preUpdate,
    postUpdate,
    cleanup,

}
