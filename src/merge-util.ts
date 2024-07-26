import { JSONPath } from 'jsonpath-plus';

/**
 * allows to specify filter options for select, remove and merge operations
 */
export interface FilterOptions<T extends MergeOptionValueType = string> {
  /**
   * The property, which will be queried
   */
  property?: string;
  /**
   * The value of the poperty to be filtered for. May be a path (starting with "/") in certain cases
   */
  value?: T;
  /**
   * The Operator for the filtering expression
   */
  operator?: FilterOperator;
}

export enum MergePositionIndicator {
  BEFORE = '___before___',
  AFTER = '___after___',
  OVERWRITE = '___overwrite___',
  LOCALMERGE = '___merge___',
}

export enum IndexIndicator {
  END = '__end__',
}

export type MergeObject = Record<string, any>;
export type MergePosition = MergePositionIndicator | string; // 'before' and 'after' may have a special meaning!
export type MergeOptionValueType = number | string | boolean | null;
export type ModelType = NonNullable<MergeObject>;

export type MergePropertyKey = `$merge$${string}`;
export const DEFAULT_MERGE_POSITION_PROPERTY = `$merge$insertionPoint`;
export const DEFAULT_MERGE_TARGET_PROPERTY = `$merge$target`;

/**
 * Allows specification of options for merge operations.
 */
export interface MergeOptions<T extends MergeOptionValueType = string>
  extends FilterOptions<T> {
  /**
   * designates either the merge aspect (e.g. a specific array in an object identified
   * by "property === value" like "content" or "header")
   *
   * or the relative merge position to the object identified by the filter expression (before / after)
   *
   */
  relativeMergePosition?: MergePosition;

  /**
   * Alternative to
   */
  aspect?: string;

  /**
   * if we merge into an array, we can specify an index here.
   * "IndexIndicator.END" merges into the end of an array
   *
   * if omitted, objects are inserted into an array at index 0
   *
   * if sort option is specified, the actual index after the merge may differ from the one specified here
   */
  index?: number | IndexIndicator;

  /**
   * optional: identifies, WHO initiated merging a specific object. Useful, when "unmerge" is needed
   */
  contributor?: string;
  contributerPropertyName?: string;

  /**
   * addtional data, which is stored in the merged object with the key "$merge$metadata".
   * Probably not supported by all merge ops.
   */
  mergeData?: Record<string, any>;

  /**
   * Either the name of a property, which supports natural sorting or a sorting function,
   * taking the objects to be sorted
   */
  sort?: string | ((o1: MergeObject, o2: MergeObject) => number);

  /**
   * Per default a failed merge op throws an error.
   *
   * * Specify 'ignore' to circumvent that
   * * Specify a function to be called if dealing with that error is necessary
   */
  onError?: 'ignore' | ((message: string, ...additionalInfo: any) => void);
}

/**
 * This interface defines options for the determineSnippetDependencies function
 */
export interface DependencyOptions<S extends MergeObject> {
  /**
   * a property in a snippet of type S identifying an insertion point
   * A snippet type does not need to have this property at root level
   */
  insertionPropertyName: string;

  /**
   * a property in a snippet of type S identifying where the snippet is to be merged into.
   * If a snippet contributes to a model or another snippet its type MUST have such a property at root level.
   * The property may be optional though, but the type must declare it
   */
  targetPropertyName: keyof S;
}

export type MergeAllOptions<
  M extends MergeObject,
  S extends MergeObject,
  O extends MergeOptionValueType
> = MergeOptions<O> & {
  mergeAspects?: (keyof M)[];
} & Pick<DependencyOptions<S>, 'targetPropertyName'>;

export enum FilterOperator {
  sEQ = '===',
  sNEQ = '!==',
  EQ = '==',
  NEQ = '!=',
} // = 'eq' | 'neq';

export type RemoveOptions<T extends MergeOptionValueType = string> =
  FilterOptions<T>;

export type SelectOptions<T extends MergeOptionValueType = string> =
  FilterOptions<T>;

export const ROOT_MERGE_TARGET = '$root';

/**
 * Options for the pick merge function
 */
export type PickMergeOptions = Pick<
  MergeOptions,
  'property' | 'onError' | 'contributor' | 'contributerPropertyName'
> & {
  /**
   * When set to "false", mergePickedObjects will not structurally merge the remaining contributing model
   */
  skipRemainder?: boolean;
};

/**
 * This function picks matching (sub)objects from two provided objects and merges them.
 *
 * Optionally also merges the remaining contribution aligned to the structure of the base model.
 *
 * Does not support ad hoc sorting. Use deepSort from object utils.
 *
 * @param baseModel the model receiving contributions from another object. Will be modified (except if no matchint objects found!
 * @param contributingModel the model potentially providing matchiung (sub)objects. Will not be modified.
 * @param options see PickMergeOptions, contain the property name, which is used to match two objects
 * @returns the modified baseModel. May be unsorted in places
 */
export function mergePickedObjects<M extends ModelType>(
  baseModel: M,
  contributingModel: M,
  options: PickMergeOptions
): M {
  if (options.property == null) {
    handleError(
      `No property specified for finding matching objects`,
      baseModel,
      contributingModel,
      options
    );
    return baseModel;
  }

  const prop = options.property;

  const contributingClone = structuredClone(contributingModel);

  const contributionSelectionResults = selectOrRemove(
    contributingClone,
    {
      operator: FilterOperator.sNEQ,
      property: options.property,
      value: undefined,
    },
    'select'
  );

  const baseObjects = select(baseModel, {
    operator: FilterOperator.sNEQ,
    property: options.property,
    value: undefined,
  });

  const ids = baseObjects.map((obj) => obj[prop]);
  const distinctIds = [...new Set(ids)];
  if (distinctIds.length !== ids.length) {
    // handleError/Warning? contains duplicate matching prop
  }

  // For each result, JSONPath delivers a path expression
  // following the pattern of multiple terms:
  // "['objkey'][index]" in case of an array member
  // and
  // "['objkey']" for plain objects
  // e.g. $['myArr'][0]['mySubArr'][0]['mySubSubArr'][0]['myMemberObj']
  // The number of bracketed terms indicate the depth level of a result object
  contributionSelectionResults.sort(
    (a, b) =>
      (b.path?.split('[').length ?? 0) - (a.path?.split('[').length ?? 0)
  );

  const contribObjects = contributionSelectionResults.map(
    (r) => r.selectedObject
  );

  const matched = contribObjects.filter((obj) =>
    distinctIds.some((id) => obj[prop] === id)
  );

  matched.forEach((contrib) => {
    const baseObj = baseObjects.find((bo) => bo[prop] === contrib[prop]);
    merge(baseObj, contrib, {
      relativeMergePosition: MergePositionIndicator.LOCALMERGE,
      contributerPropertyName: options.contributerPropertyName,
      contributor: options.contributor,
    });
    // merged deep objects need to be removed or they might re-appear if a parent is merged....
    remove(contributingClone, {
      operator: FilterOperator.sEQ,
      property: prop,
      value: contrib[prop],
    });
  });

  if (!options.skipRemainder) {
    merge(baseModel, contributingClone, {
      relativeMergePosition: MergePositionIndicator.LOCALMERGE,
      contributerPropertyName: options.contributerPropertyName,
      contributor: options.contributor,
    });
  }
  return baseModel;
}

/**
 * Merges all provided snippets into the specified model. Merge is performed in-place,
 * i.e. the baseModel is changed.
 * Possibly manifest dependencies between snippets will be considered.
 *
 * Circular dependencies will cause an Error to be thrown.
 *
 * @param baseModel The base model receiving all the snippets
 * @param snippets An array of snippets to be merged into the base model
 * @param options the merge options
 * @returns the provided baseModel object - with all the snippets merged into it
 * @throws an Error, if snippets have circular dependencies. Also throws on invalid merge options
 * and/or objects if options do not provide an error callback or hav set onError to ignore
 */
export function mergeAll<
  M extends ModelType,
  S extends MergeObject,
  O extends MergeOptionValueType = string
>(baseModel: M, snippets: S[], options: MergeAllOptions<M, S, O>): M {
  // XXX: currently, we have a two-stage merge process for multiple snips with potential deps
  // FIRSTLY, merge gather deps of all snippets and merge tham accordingly
  // SECONDLY, merge the merged snippets aka the "remaining" snippet roots into the base model.
  // Reason: Deps among snippets MUST be specified by providing insert points and target refs.
  // Snippets being merged into the base model, might lack a target and in addition, the base might not provide an insertPoint.
  // In that case the computing of dependencies would yield NO dependencies.
  // This is why the base model cannot partake in the dependency computing, as there would be no deps reported.
  // TODO/DISCUSS --> We could add an artifical targetProp poiting to "$root" to every snippet, which does not initially specify one
  //          In addition, the baseModel must be identified, so we would know which $root is meant when approaching such an added target property

  const mergepointProperty =
    options.property ?? DEFAULT_MERGE_POSITION_PROPERTY;
  const snippetDependencies = determineSnippetDependencies(snippets, {
    insertionPropertyName: mergepointProperty,
    targetPropertyName: options.targetPropertyName,
  });

  // leaves are the snippets which may provide to others, but do not receive content
  const leaves = getLeafNodes(snippetDependencies);

  // merge the snippet according to their dependencies
  const mergedSnippets: S[] = leaves.map((depNode) => {
    while (depNode.contributesTo != null) {
      const mergeBase = depNode.contributesTo.wrappedObject;
      const snip = depNode.wrappedObject;

      mergeWithAspects<S, S, O>(
        mergeBase,
        snip,
        options as MergeAllOptions<S, S, O>
      ); // TS cannot deduct type of keyof<M> in the union options type
      depNode = depNode.contributesTo;
    }
    return depNode.wrappedObject;
  });

  // mergedSnipptets: all the snippets merged according to their dependencies
  mergedSnippets.forEach((snip) => {
    mergeWithAspects(baseModel, snip, options);
  });
  return baseModel;
}

/**
 * Merges two models/snippets by considering the specified options
 *
 * Two basic cases are supported:
 *
 * * **case 1: before or after a specific object having a specific prop in an ARRAY**
 * * **case 2: in an array ("aspect" - specified by its name) of an OBJECT with a specific prop**
 * * **case 3: in an array ("aspect" - specified by its name) of an OBJECT with a specific PATH.
 * This is useful for hierarchical structures, where the filter properties might not be unique**
 *
 * @param baseModel the base object, which gets the snippet merged into
 * @param snippet the object, which will be merged into the base model
 * @param options the merge options.
 * @returns the base model. If the merge failed or there was nothing to merged it is unchanged
 */
export function merge<
  M extends ModelType,
  S extends MergeObject,
  O extends MergeOptionValueType = string
>(baseModel: M, snippet: S, options: MergeOptions<O>): M {
  const mergeRelative = options.relativeMergePosition != null;

  const prop = options.property;

  if (prop == null && options.aspect != null) {
    const arr = getArray(baseModel, options, true);
    mergeIntoArrayProperty(arr as MergeObject[] | undefined, snippet, options);
    return baseModel;
  } else if (
    prop == null &&
    options.relativeMergePosition === MergePositionIndicator.LOCALMERGE
  ) {
    // destObject will be the root --> before or after does not make sense in this context
    deepMerge(baseModel, snippet, options);
    return baseModel;
    // everything else throws
  } else if (prop == null) {
    handleError(
      `No query property and no aspect (array name) specified to search in base object.`,
      baseModel,
      snippet,
      options
    );
    return baseModel;
  }

  const op = options.operator ?? FilterOperator.sEQ;
  const path = buildJSONPathQuery(prop, options.value, op);

  let mergeDone = false;
  const results = JSONPath<unknown[]>({
    json: baseModel,
    path: path,
    wrap: true,
    callback: (_selectedValueOrProperty, _resultType, fullPayloadObject) => {
      const destObject = mergeRelative
        ? fullPayloadObject.parent
        : fullPayloadObject.value;
      // Do not insert a snippet multiple times, if position criteria matches more than one object!
      // a primitive or a function is not suitable for merging
      if (!(typeof destObject === 'object') || mergeDone) {
        return;
      }

      // XXX: Please leave the commented diagnostic message here
      /* console.warn(
        'merge jsonpath callback:',
        (snippet as any)[options.property ?? ''],
        path,
        JSON.stringify(destObject, undefined, 2)
        // JSON.stringify(fullPayloadObject, undefined, 2)
      ); 
      */

      if (Array.isArray(destObject) && mergeRelative) {
        const destIndex = destObject.findIndex((elem: any) =>
          prop != null ? elem[prop] === options.value : false
        );
        mergeDone = insertSnip(
          destObject,
          snippet,
          destIndex,
          options.relativeMergePosition,
          options.contributor
        );
      } else if (!Array.isArray(destObject) && !mergeRelative) {
        const arr = getArray(destObject, options, true);

        mergeDone = mergeIntoArrayProperty(
          arr as object[] | undefined,
          snippet,
          options
        );
      } else {
        // `Not YET supported`
      }
    },
  });
  const queryHadResults = results != null && results.length > 0;

  if (!mergeDone && !queryHadResults && options.aspect != null) {
    // nothing found querying. See, if we are in root
    const destObject = baseModel[options.aspect] as MergeObject[] | undefined;
    mergeDone = mergeIntoArrayProperty(destObject, snippet, options);
  }

  if (!mergeDone) {
    const txt = queryHadResults
      ? `None of the ${results.length} query results was suitable for merging.`
      : `Cannot merge objects. No results found querying the base object with path: ${path}.`;
    handleError(txt, baseModel, snippet, options, path, results);
  }

  return baseModel;
}

function mergeWithAspects<
  M extends ModelType,
  S extends MergeObject,
  O extends MergeOptionValueType = string
>(mergeBase: M, snip: S, options: MergeAllOptions<M, S, O>): M {
  const mergeAspects = options.mergeAspects;
  const target = (
    options.targetPropertyName != null
      ? snip[options.targetPropertyName]
      : options.value
  ) as MergeOptionValueType;

  if (
    target != null &&
    typeof target !== 'string' &&
    typeof target !== 'number'
  ) {
    throw new Error(`target should be string|number, but is ${typeof target}`);
  }

  const noExplicitMergeTargetSpecified =
    target == null || target === ROOT_MERGE_TARGET;

  if (mergeAspects == null || mergeAspects.length <= 0) {
    merge(mergeBase, snip, {
      ...options,
      value: target,
      property: noExplicitMergeTargetSpecified ? undefined : options.property,
    });
  }

  mergeAspects?.forEach((mk) => {
    mergeAspect(mergeBase, snip, {
      property: noExplicitMergeTargetSpecified ? undefined : options.property,
      value: noExplicitMergeTargetSpecified ? null : target,
      relativeMergePosition: options.relativeMergePosition,
      aspect: String(mk),
      index: options.index ?? IndexIndicator.END,
      sort: options.sort,
      contributor: options.contributor,
    });
  });
  return mergeBase;
}

function handleError(
  message: string,
  model: MergeObject,
  snippet: object | undefined,
  options: Pick<MergeOptions<any>, 'onError'>,
  querypath?: string,
  queryResults?: any[]
) {
  if (options.onError === 'ignore') {
    return;
  }
  if (typeof options.onError === 'function') {
    options.onError(message, model, snippet, options, querypath, queryResults);
    return;
  }
  throw new Error(
    `${message}. Did not merge the specified base object: "${JSON.stringify(
      model
    )}" with the snippet "${JSON.stringify(
      snippet
    )}" by using the options: "${JSON.stringify(options, undefined, 2)}"`
  );
}

/**
 * Merges an aspect/part of a specified snippet object into a provided model.
 * The aspect is expected to be an array containing a number of mergeable objects.
 *
 * Can be used e.g. for views, where in snippet objects we have the aspects "header" and "content"
 *
 * @param baseModel the base model
 * @param snip the snippet object/container
 * @param options merge options containing the merge position
 * @returns
 */
function mergeAspect<
  BV extends MergeObject,
  MV extends MergeObject,
  VT extends MergeOptionValueType
>(baseModel: BV, snip: MV, options: MergeOptions<VT>) {
  const arrayOfAtomicSnippets = snip[options.aspect as keyof MV];

  if (arrayOfAtomicSnippets != null && Array.isArray(arrayOfAtomicSnippets)) {
    (arrayOfAtomicSnippets as MV[]).forEach((csnip) =>
      merge(baseModel, csnip, options)
    );
  }
  return baseModel;
}

/**
 * Selects (Queries) entries from arrays which fulfill a provided filter expression.
 *  *
 * @param model The object to query
 * @param options the query options
 * @returns an array of objects fulfilling the conditions specified by the query options
 */
export function select<
  M extends ModelType,
  O extends MergeOptionValueType = string,
  R = any
>(model: M, options: SelectOptions<O> & { jsonPathExpression?: string }): R[] {
  return selectOrRemove<M, O, R>(model, options, 'select').map(
    (v) => v.selectedObject
  );
}

/**
 * Removes entries from arrays which fulfill a provided filter expression.
 *
 * If the selection would be the provided source model itself, it will be completely emptied!
 */
export function remove<
  M extends ModelType,
  O extends MergeOptionValueType = string,
  R = any
>(
  modelSrc: M,
  options: RemoveOptions<O> & { jsonPathExpression?: string }
): R[] {
  return selectOrRemove<M, O, R>(modelSrc, options, 'remove').map(
    (v) => v.selectedObject
  );
}

export function getLeafNodes<S extends NonNullable<object>>(
  models: Map<string, DependencyNode<S>>
) {
  return Array.from(models.values()).filter(
    (mn) => mn.contributors.length === 0
  );
}

export function getRootNodes<S extends NonNullable<object>>(
  models: Map<string, DependencyNode<S>>
) {
  return Array.from(models.values()).filter((mn) => mn.contributesTo == null);
}

/**
 * Determines dependencies between snippets. Each snippet is expected to contain
 * @param snippets
 * @param options options for checking the dependencies
 * @returns map containing the snippet dependency graph
 */
export function determineSnippetDependencies<S extends NonNullable<object>>(
  snippets: S[],
  options: DependencyOptions<S>
) {
  const path = `$..[?(@property === '${String(
    options.insertionPropertyName
  )}' && @ != null)]`;

  const depNodes: Map<string, DependencyNode<S>> = new Map();
  snippets.forEach((m, i) => {
    const mnode = getOrCreateIfAbsent(i.toString(), m, depNodes);

    snippets.forEach((n, j) => {
      const currentSnippetProvides = n[options.targetPropertyName] != null;

      // insertionProperty can be ANYWHERE in the model/snippet, not just at root level!
      const insertionPoints = JSONPath<string[]>(path, m, undefined, undefined);
      // needed in case of debugging, please do not delete
      // console.warn(`ins pt`, options, insertionPoints);
      const hasDep =
        currentSnippetProvides &&
        insertionPoints.some((name) => name === n[options.targetPropertyName]);

      if (hasDep && i !== j) {
        // needed in case of debugging, please do not delete
        // console.warn(`### Snip@${j} contributes to Snip@${i}`);
        const contN = getOrCreateIfAbsent(j.toString(), n, depNodes);
        contN.contributesTo = mnode;
        mnode.contributors.push(contN);
      } else if (hasDep && i === j) {
        throw new Error(
          `Model/Snippet at index ${i} specifies itself as contributor considering the options: ${JSON.stringify(
            options
          )}`
        );
      }
    });
  });
  checkCirularContributions(depNodes);
  return depNodes;
}

/**
 * Builds a JSONPath query from the specified arguments
 *
 * @param propertyName the name of the property to use as filter
 * @param value the value of that property
 * @param operator the operator to use (e.g. "===")
 * @returns a string containing the query in JSONPath syntax
 */
export function buildJSONPathQuery(
  propertyName: string,
  value: MergeOptionValueType | undefined,
  operator = FilterOperator.sEQ
): string {
  let query: string;

  if (queryPropertyValueIsPath(value)) {
    const pathsegments = value
      .split(`/`)
      .filter((seg) => seg != null && seg !== '');
    query = pathsegments
      .map((ps) => ps.trim())
      .filter((ps) => ps !== '' && ps != null)
      .reduce(
        (prev, cur) => `${prev}.*[?(@.${propertyName} ${operator} '${cur}')]`,
        '$'
      );
  } else {
    const v = typeof value === 'string' ? escape(value) : value;
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    query = `$..[?(@property === '${propertyName}' && @ ${operator} ${v})]^`;
    // query = `$..[?(@.${propertyName} ${operator} ${v})]`; // alternative, but misses the root object!!
  }
  return query;
}

/**
 * This function descends in to a (merge) path and ensures the presence of child objects/arrays along the way.
 * Usage is restricted to recursive hierarchical sturctures, as this is the case with view or nav models.
 *
 * Example:
 *
 * jpath: areas[?(@.id=='home-screen')].childGroups[?(@.id=='VIEW_GLOBAL')].childGroups[?(@.id=='TASK_AllProductionRelevant')]
 *
 * shortended: "home-screen/VIEW_GLOBAL/TASK_ALLProductionRelevant"
 *    implicitly assumed: path values held by property id, aspects for creation if not present: "childGroups"
 *
 * 1: test each segment recursively, starting at root object.
 * 2: on first segment failing the query:
 *    create object it based on the given template
 *
 * Thus the necessary options would be:
 *
 * options.property = "id"
 * options.value = "home-screen/VIEW_GLOBAL/TASK_ALLProductionRelevant"
 * options.aspect = "childGroups"
 * options.aspectIsArray = true  // default is true !
 * options.rootAspectDiffers = true // default is false !
 *
 *
 * @param obj the base object
 * @param options the options for this optional pre-merge operation
 * @returns the modified base object
 * @throws Error, if the necessary (sub)structures cannot be created or options are invalid
 */
export function ensureDescendantsHierarchy<S extends MergeObject>(
  obj: S,
  options: Required<
    Pick<
      MergeOptions, // only string allowed for paths!!
      'aspect' | 'property' | 'value'
    >
  > &
    Pick<MergeOptions, 'contributor' | 'contributerPropertyName'> & {
      aspectIsArray?: boolean;
      rootAspect?: string;
    }
): S {
  const aspectIsArray = options.aspectIsArray ?? true;
  const rootAspect = options.rootAspect ?? undefined;

  const tokens = (options.value ?? '')
    .split(`/`)
    .filter((tok) => (tok?.length ?? 0) > 0);
  const jp = JSONPath({ autostart: false, wrap: true, path: '', json: null });
  const aspect = options.aspect ?? '';
  const pathProperty = options.property ?? '';

  let current: any = obj;
  tokens.forEach((tok, i) => {
    // needed e.g. for nav models where root aspect names differ from children aspects. "areas" --> "childGroups"
    // to support arbitrary structures more complex params would be necessary --> but then it would be easier to just specify a JSON path directly!!
    const childExpression = rootAspect != null && i === 0 ? '*' : aspect;
    const qPath = aspectIsArray
      ? `$.${childExpression}[?(@.${pathProperty} === ${escapeValue(tok)})]` // works well with array structs like our view models
      : `$.${childExpression}[?(@property === '${pathProperty}' && @ === ${escapeValue(
          tok
        )})]^`; // works with plain object based nesting

    const qResults: unknown[] = jp.evaluate(
      qPath,
      current,
      (_found, _type, _full) => {
        // JSONPath API mandates spec of cb fn
      },
      (..._args) => true // JSONPath API mandates the spec of "@other" cb, regardless if needed in our context
    ) as unknown[];

    if (qResults.length === 0) {
      const inserted: MergeObject = {};
      if (options.contributor != null) {
        markObjectAsContributed(inserted, options);
      }

      Object.defineProperty(inserted, pathProperty, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: tok,
      });

      if (aspect != null && aspectIsArray) {
        Object.defineProperty(inserted, aspect, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: new Array(0),
        });
        const actualAspectArray = getArray(
          current,
          { aspect: i > 0 ? aspect : rootAspect },
          true
        );
        if (actualAspectArray != null) {
          actualAspectArray.push(inserted);
        }
      } else if (aspect != null && current[aspect] == null) {
        current[aspect] = inserted;
      } else {
        throw new Error(
          `'${aspect}' already present '@${tok}' in ${JSON.stringify(
            current,
            undefined,
            2
          )}`
        );
      }

      current = inserted;
    } else {
      if (typeof qResults[0] !== 'object' || qResults[0] == null) {
        throw new Error(
          `Query result is not an object! Cannot add child properties to '${String(
            qResults[0]
          )}'`
        );
      }
      current = qResults[0];
    }
  });
  return obj;
}

function queryPropertyValueIsPath(query: unknown): query is string {
  return typeof query === 'string' && query.startsWith('/');
}

function checkCirularContributions<S extends NonNullable<object>>(
  dependencies: Map<string, DependencyNode<S>>
) {
  for (const value of dependencies.values()) {
    let contributes: DependencyNode | null | undefined = value;
    const path: string[] = [];
    while (contributes != null) {
      // TS does not recognize that "contributes" cannot be falsy within the loop
      if (path.some((k) => k === contributes?.key)) {
        path.push(contributes.key);
        throw new Error(
          `Computed snippet deps contain at least one circular dependency: ${path.reduce(
            (p1, p2) => `${p1}${p1 != null && p1 !== '' ? '->' : ''}${p2}`,
            ''
          )}`
        );
      }
      path.push(contributes.key);
      contributes = contributes.contributesTo;
    }
  }
}

/**
 * Non API helper: Merges a snippet into an array property of the provided destination object.
 * The array to merge the snippet into is identified by "pos" in the options.
 *
 * If an array with that property name dioes not exist in the destination object, it is created
 *
 * **If a property with the specified name already exists in the destination object and is not an array, no merge op is performed**
 *
 * @param destinationObject a non null object recieving the snippet
 * @param snippet the snippet to insert into one of destination object's arrays
 * @param options the merge options
 * @returns true, if merge performed, false otherwise
 */
function mergeIntoArrayProperty<
  T extends MergeObject,
  O extends MergeOptionValueType = string
>(
  destObject: T[] | undefined,
  snippet: MergeObject,
  options: MergeOptions<O>
): boolean {
  let mergeDone = false;
  if (destObject === undefined || !Array.isArray(destObject)) {
    return false;
  }

  const existingObjectInd = getIndexOfObjectInArray(
    destObject,
    snippet,
    options.property
  );

  // the object already exists in the array. create a union of the snip and the existing object
  if (existingObjectInd >= 0) {
    const mergedObject = {
      ...snippet,
      ...destObject[existingObjectInd],
    };
    destObject[existingObjectInd] = mergedObject;
    mergeDone = true;
  } else if (typeof options.index === 'number') {
    mergeDone = insertSnip(
      destObject,
      snippet,
      options.index,
      options.relativeMergePosition,
      options.contributor
    );
  } else {
    mergeDone = insertSnip(
      destObject,
      snippet,
      options.index === IndexIndicator.END ? destObject.length : 0,
      options.relativeMergePosition,
      options.contributor
    );
  }

  if (mergeDone && options.sort != null) {
    if (typeof options.sort === 'string') {
      const sortProp = options.sort as keyof T;
      destObject.sort((a, b) => {
        const sa = a[sortProp];
        const sb = b[sortProp];
        return (
          (typeof sa === 'number' ? sa : 0) - (typeof sb === 'number' ? sb : 0)
        );
      });
    } else if (typeof options.sort === 'function') {
      const sortFn = options.sort;
      destObject.sort(sortFn);
    }
  }

  return mergeDone;
}

/**
 * Checks if destObject array contains already an object having the same uniqueProperty value
 * @param destObject
 * @param snippet
 * @param uniqueProperty
 * @returns the index of the object in the array, -1 if not found
 */
function getIndexOfObjectInArray(
  destObject: unknown[],
  snippet: MergeObject,
  uniqueProperty?: string
) {
  if (uniqueProperty == null) {
    return -1;
  }
  const idval = snippet[uniqueProperty];
  return destObject.findIndex(
    (elem) => idval != null && (elem as any)[uniqueProperty] === idval
  );
}

// helper function for selecting or removing object parts
export function selectOrRemove<
  M extends ModelType,
  O extends MergeOptionValueType = string,
  R = any
>(
  modelSrc: M,
  options: RemoveOptions<O> & { jsonPathExpression?: string },
  operation: 'remove' | 'select'
): { selectedObject: R; path?: string }[] {
  const prop = options.property ?? 'evsModel';
  const value = escapeValue(options.value);

  const pathExp =
    options.jsonPathExpression != null && options.jsonPathExpression !== ''
      ? options.jsonPathExpression
      : `$..[?(@property==='${prop}' && @ ${
          options.operator ?? FilterOperator.sEQ
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        }${value})]^`;
  try {
    const selected: Map<
      R,
      {
        parent: object | unknown[];
        parentProperty: string | number;
        path?: string;
      }
    > = new Map();
    JSONPath({
      json: modelSrc,
      path: pathExp,
      wrap: true,
      callback: (selectedValueOrProperty, _resultType, fullPayloadObject) => {
        selected.set(selectedValueOrProperty, fullPayloadObject);
      },
    });

    const selectedArray = Array.from(selected.values());
    if (operation === 'remove') {
      // reverse, otherwise indices of possibly found array elements won't be accurate!
      const removeCandidates = [...selectedArray].reverse();
      for (const remCand of removeCandidates) {
        if (remCand.path === '$' && remCand.parent == null) {
          // The whole object shall be deleted? We cannot do that, so just empty it
          Object.keys(modelSrc).forEach((key) => delete modelSrc[key]);
          break; // we can skip other remove candidates...there will be nothing left
        } else {
          deleteValue(remCand.parent, remCand.parentProperty);
        }
      }
    }

    return Array.from(selected.entries()).map((e) => ({
      selectedObject: e[0],
      path: e[1].path,
    }));
  } catch (err) {
    throw new Error(`Error occurred on operation ${operation}: ${String(err)}`);
  }
}

//
// non api helper function for deleting
//
function deleteValue(
  parentObjectOrArray: unknown[] | object,
  propertyOrIndex: number | string
) {
  let removed: unknown;
  if (
    Array.isArray(parentObjectOrArray) &&
    typeof propertyOrIndex === 'number'
  ) {
    removed = parentObjectOrArray.splice(propertyOrIndex, 1)[0];
  } else if (
    typeof parentObjectOrArray === 'object' &&
    typeof propertyOrIndex === 'string'
  ) {
    const p = parentObjectOrArray as Record<string | number | symbol, unknown>;
    removed = p[propertyOrIndex];
    delete p[propertyOrIndex];
  }
  return removed;
}

// helper function
function adjustIndexToArrayBounds(arr: any[], rInd: number): number {
  let ind = rInd;
  if (ind < 0) {
    ind = 0;
  }
  if (ind > arr.length) {
    ind = arr.length;
  }
  return ind;
}

/**
 * inserts a snippet
 * @param destinationArray
 * @param snippet
 * @param destinationIndex
 * @param mergePosition
 * @param contributor
 */
function insertSnip(
  destinationArray: unknown[],
  snippet: unknown,
  destinationIndex: number,
  mergePosition?: MergePosition,
  contributor?: string
): boolean {
  if (destinationArray == null || snippet == null) {
    return false;
  }
  let index = destinationIndex;

  if (mergePosition === MergePositionIndicator.AFTER) {
    index = destinationIndex + 1;
  }

  index = adjustIndexToArrayBounds(destinationArray, index);

  const snippets = Array.isArray(snippet) ? snippet : [snippet];

  if (contributor != null) {
    snippets
      .filter((snip) => snip != null)
      .forEach((snip) =>
        markObjectAsContributed(snip, {
          contributor: contributor,
        })
      ); // (snip.contributor = contributor)
  }

  const deleteCount =
    mergePosition === MergePositionIndicator.OVERWRITE ? 1 : 0;

  if (mergePosition === MergePositionIndicator.LOCALMERGE) {
    const newObject = {
      ...(destinationArray[index] ?? {}),
      ...snippets[0],
    };
    destinationArray[index] = newObject;
  } else {
    destinationArray.splice(index, deleteCount, ...snippets);
  }

  return true;
}

export interface DependencyNode<T = unknown> {
  key: string;
  contributesTo: DependencyNode<T> | null;
  contributors: DependencyNode<T>[];
  wrappedObject: T;
}

function getOrCreateIfAbsent<S extends NonNullable<object>>(
  key: string,
  targetObject: S,
  map: Map<string, DependencyNode<S>>
): DependencyNode<S> {
  let node = map.get(key);
  if (node == null) {
    node = {
      key: key,
      wrappedObject: targetObject,
      contributesTo: null,
      contributors: [],
    };
    map.set(key, node);
  }
  return node;
}

function escapeValue<T extends MergeOptionValueType | undefined>(value: T): T {
  return typeof value === 'string' ? (escape(value) as T) : value;
}

/**
 * JSONPath plus cannot handle semicolons in queries????
 */
function escape(str: string): string {
  return `'${replaceAll(str, ';', '\\u003b')}'`;
}

/**
 * internal helper fn
 */
function getArray<O extends NonNullable<object>>(
  destObject: O,
  options: MergeOptions<any>,
  allowCreationIfNotPresent = false
): unknown[] | undefined {
  const key = options.aspect;
  if (key == null) {
    return undefined;
  }

  let arr = destObject[key as keyof O];
  if (Array.isArray(arr)) {
    return arr as unknown[];
  }

  const aspectExists = hasOwnProperty(destObject, key);
  if (allowCreationIfNotPresent && !aspectExists) {
    arr = new Array(0) as O[keyof O];
    destObject[key as keyof O] = arr;
    return arr as unknown[];
  }

  handleError(
    `Failed to get an array with key "${String(
      key
    )}" from object: ${JSON.stringify(destObject)}:${
      aspectExists ? 'not an array!' : 'not existing, but creation disallowed'
    }`,
    destObject,
    undefined,
    options,
    key
  );
  return undefined;
}

/**
 * Deep merges an object tree. Will alter objA.
 * * Properties present only in A or in both A and B will not be overwritten.
 * * Properties present only in B will be referenced in A (no clone is created!!)
 *
 * If a property key refers to an array in both merge participants, the array contents of B are pushed to A
 *
 * @param objA the base object for the merge operation
 * @param objB the contributing object, which will be merged into A
 * @param options contributor options: when merging array contents, the contributor's objects will be marked with the provided info.
 * @returns objA with objB properties merged into it
 */
export function deepMerge(
  objA: unknown,
  objB: unknown,
  options?: Pick<MergeOptions, 'contributor' | 'contributerPropertyName'>
) {
  if (objA == null || objB == null) {
    return objA;
  }
  if (Array.isArray(objA) && Array.isArray(objB)) {
    const marked = objB.map((b) => markObjectAsContributed(b, options));
    objA.push(...marked);
  } else if (Array.isArray(objA)) {
    return objA; // opposite is not an array keep src
  } else if (typeof objA === 'object' && typeof objA === 'object') {
    // object property mergers: do not insert contributor!
    // TODO: we might need to keep track, which object provided which property (or value if both had the same prop with different vals!
    const entriesA = Object.entries(objA);
    entriesA.forEach((e) => deepMerge(e[1], (objB as any)[e[0]], options));
    Object.entries(objB)
      .filter((eb) => !Object.hasOwn(objA, eb[0]))
      .forEach((eb) => {
        markObjectAsContributed(eb[1], options);
        (objA as any)[eb[0]] = eb[1];
      });
  }
  return objA;
}

function markObjectAsContributed(
  mergeObj: unknown,
  options?: {
    contributerPropertyName?: string;
    contributor?: string;
  }
): unknown {
  if (
    typeof mergeObj !== 'object' ||
    Array.isArray(mergeObj) ||
    !Object.isExtensible(mergeObj) // frozen, sealed,....
  ) {
    return mergeObj;
  }  

  if (
    options?.contributerPropertyName &&
    options?.contributerPropertyName.trim().length > 0
  ) {
    (mergeObj as any)[options.contributerPropertyName] = options.contributor;
  } else if (options?.contributor) {
    (mergeObj as any).contributor = options?.contributor;
  }
  return mergeObj;
}

export function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

/**
 * Checks, if an object has an own property with the specified key
 * https://eslint.org/docs/latest/rules/no-prototype-builtins
 * @param obj the object
 * @param key the key of the property
 * @returns true, if the object does have this property
 */
export function hasOwnProperty(obj: object, key: string | symbol | number) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

/**
 * "Backport" of replaceAll (will be avaiable from es2021)
 * @param src the string to search in
 * @param find the string to be replaced
 * @param replace the replacement
 * @returns the (possibly) modified copy of src
 */
export function replaceAll(src: string, find: string, replace: string) {
  return src.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

export function doCompare<OT=any>(op1: OT, operator:FilterOperator, op2: OT): boolean {
  switch(operator) {
    case FilterOperator.EQ: return op1 == op2;
    case FilterOperator.sEQ: return op1 === op2;
    case FilterOperator.NEQ: return op1 != op2;
    case FilterOperator.sNEQ: return op1 !== op2;
    default: return false;
  }
}


export function markContrib(  
  model: unknown|unknown[],
  options: FilterOptions & { objectsMustHaveProps?:string[], doNotFollow?: string[], eraseMeta?: boolean }
): void {
  
  if(typeof model !=='object') {
    return;
  }

  if(Array.isArray(model)) {
    model.forEach(el => markContrib(el,options))
    return;
  }

  const m = model as Record<string,any>;
  const prop = options.property??'$contributor';  
  const dnf = options.doNotFollow??[];
  const mustHave = options.objectsMustHaveProps;

  let markHere = true;
  for(let p in m) {
    if(p===prop) {
      continue;
    }    
    if(typeof m[p]==='object' && !dnf.find(n => n===p) && !(Array.isArray(m[p]) && m[p].length===0)) {
      
      markContrib(m[p], options);
      markHere = false || (options.eraseMeta ?? false);
    } 
  }
  
  if(markHere) {
    if(Object.hasOwn(m,prop)) {
      if(options.eraseMeta) {
        delete(m[prop]);
      } else {
        console.error(`Already marked with contrib...overwriting ${m[prop]} with ${options.value}`)
      }
    }
    if(mustHave==null || mustHave.find(p => p===prop)) {
      m[prop] = options.value;
    }
  }  

  /*  
  if(markHere && m[prop]!=null && Array.isArray(m[prop])) {
    m[prop].push(options.value);
  } else if(markHere && m[prop]==null) {
    m[prop] = [options.value];
  }  
  */
    
}