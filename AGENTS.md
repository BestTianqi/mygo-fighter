# Working Conventions

- Before making changes, sync with the remote first: fetch `origin/main`, review new commits, then merge into the current branch; preserve the work of users and other contributors.
- After changes are complete, check and verify first, then commit, push, and confirm local and remote are in sync. If there are new commits on the remote before pushing, merge them first and re-verify. Do not use force push or discard uncommitted changes.
- Preserve the existing architecture of the React / TypeScript frontend, the Scala online backend, and the shared TypeScript combat kernel.
- Preserve the original characters, actions, maps, effects, and audio/video. `assets/` is the source material, and `frontend/public/` is the runtime material; check references before cleaning up. Generated output and test screenshots go in the ignored output directory.
- Basic checks use `npm run check` and `npm run build`; when web publishing is involved, additionally use `npm run build:pages` and check the project subpath in the browser. Temporary verification scripts and screenshots go under the ignored `output/`; do not restore removed test directories.

## Development Requirements

Follow these conventions:

1. Public APIs and public Table methods across services are permitted call boundaries. Table maintenance ownership, internal SQL, private helper implementations, identity trust boundaries, and transaction requirements must still be clear.

2. Each backend microservice should be centralized in a folder under services/. Each service should own a clear business domain, and the code should clearly indicate which module owns the API, objects, routes, tables, and internal implementations.

3. Service folders should contain only api/, objects/, routes/, tables/, and utils/ as much as possible. If other directories need to be added, such as a directory for scripts, the reason should be explained. When logic is complex, subpaths can be further created under api/, objects/, tables/, and utils/.

4. Shared infrastructure should also have a clear home under services/, and can be centralized into an independent system module, such as services/system/. Database connection setup, server configuration, system defaults, transaction/session foundational utilities, application startup, and shared routing mechanisms should be separated from business responsibilities. If the system module needs additional directories, the reason should likewise be explained.

5. Service ownership defines maintenance responsibility and internal implementation boundaries. All backend APIs may call any service's public and well-encapsulated Table methods; SQL and private helper implementations are still managed by the owning module.
   services/
   service-a/
   api/
   objects/
   routes/
   tables/
   utils/
   service-b/
   api/
   objects/
   routes/
   tables/
   utils/

The above directories are used as actually needed; services/system/ is an example name for shared infrastructure ownership.

6. Services may expose API messages and encapsulated table methods. Public Table defs should be callable by APIs throughout the backend.

7. Table methods should encapsulate SQL, parameter binding, execution, and row mapping, providing clearly meaningful method names, clearly typed inputs, and IO[T] return values. Callers complete table operations through these methods and should not obtain SQL values and execute them themselves, nor bypass encapsulation via arbitrary SQL parameters.

8. SQL values, row mapping helpers, and other internal details should use appropriate private visibility. Each service's utils utility functions should all use private[service name] def and be for use only within that service.

   private val findByIdSql = "..."
   def findById(connection: Connection, id: TextbookId): IO[Option[Textbook]] = ...

   // Example visibility for service-internal utility functions:
   private[books] def buildSummary(...): ... = ...

9. The execution logic of a backend API may call:
- The plan of any API message throughout the backend.
- Public, non-SQL-value table methods exposed by any service's Table throughout the backend.
- Utility functions in the current service's utils.

10. When calling an API, first form a message instance with constructor parameters, then call plan(connection). When calling a table method, use the def provided by that table; it is not required to wrap another forwarding-only API or Service for cross-service access.

    // Calling another API:
    XXXMessage(input1, input2, ...).plan(connection)

    // Calling any service's encapsulated table method:
    TextbookTable.findById(connection, id)

    Permitted structures:
    service-b API -> plan of service-a API message
    service-b API -> public method of service-a Table

Cross-service calls do not change table maintenance ownership, nor do they open the other service's private utils, SQL values, or other unpublished implementations.

11. Clearly define ownership of permission and identity logic
    The user/account service is responsible for defining and maintaining rules for roles, permissions, login state, sessions, and token parsing. When other services need conclusions such as "is the user valid," "does the user have administrator privileges," or "which trusted user ID does the token correspond to," they may call the corresponding API.

Other services are also allowed to call encapsulated public Table methods such as user tables and session tables to obtain the required data, and to use public role or identity types. Allowing table calls does not mean this data automatically satisfies authorization conditions; callers must still handle it according to explicit business permission rules.

12. Restrict utils to the owning service, and extract them based on reuse and readability
    utils/ holds utility functions for internal use only within the current service, and each utility function should take the form private[service name] def.

Utility functions are usually extracted in the following two cases:
- The same piece of logic appears in multiple APIs or utility functions and needs reuse.
- An API's plan is too long and needs to be split into multiple functions to improve readability.

If other services need this business capability, a callable API message should be provided; if what is needed is a persistence operation, an encapsulated public Table method can be provided. Do not turn service-internal helper objects into global utilities that bypass encapsulation.

After extracting helper functions, the API file should still clearly show the main business steps and important side effects.

13. Keep the objects layer pure, concise, and use a unified data structure template

objects/ stores data structures, enums, domain value types, and serialization logic that can be used by both frontend and backend. It should be easy to browse, avoid adding unnecessary types, and should not become a place where business logic accumulates.

It should not contain unrelated business behavior, random ID generation, database access, service calls, permission checks, stateful workflows, or mapping logic that should belong to other layers.

Unless it truly belongs to serialization or the definition of the value itself, avoid adding methods such as random(), fromStored(), fromDatabaseRow(), and toDatabaseRow() to domain objects.

14. Data structures use final case class, with derived Encoder and Decoder in the companion object of the same name.

    final case class UserProfile(
    id: UserId,
    username: String,
    role: UserRole,
    createdAt: Instant
    )

    object UserProfile:
    given Encoder[UserProfile] = deriveEncoder[UserProfile]
    given Decoder[UserProfile] = deriveDecoder[UserProfile]


15. One file per object
    Avoid large aggregate model files containing many unrelated types. When Models.scala or DomainObjects.scala simultaneously contains IDs, records, enums, request types, response types, and helper utilities, it quickly becomes difficult to inspect.

Each meaningful domain object should have its own file. If a type has a companion object, keep the type and its companion object in the same file. This makes navigation, review, and refactoring easier.

    Prefer:
      objects/
        UserId.scala
        UserProfile.scala
        UserRole.scala
        BookId.scala
        BookRecord.scala

    Rather than:
      objects/
        Models.scala


16. Put imports at the top of the file
    As much as possible, place import statements at the top of the file. This makes dependencies clear at a glance and keeps files visually consistent.

17. Keep enum serialization simple and make input handling explicit

For enums, use a simple, consistent serialization interface. If the API representation and the database representation are the same, one toString and one fromString are enough.

Unless the various representations are truly different, do not introduce unnecessary parallel naming systems such as toApi, fromApi, toDatabase, fromDatabase, and fromStock.

18. Put enum conversion and codecs in the companion object
    Enum instances mainly carry data. Put string conversion methods and Encoder/Decoder in the companion object, avoiding unnecessary methods on each enum member.

Encoders reuse toString, and decoders reuse fromString, unifying string representation, input normalization, and invalid-value handling.

    enum UserRole:
      case Admin
      case Reader

    object UserRole:
      def toString(role: UserRole): String =
        role match
          case UserRole.Admin => "admin"
          case UserRole.Reader => "reader"

      def fromString(value: String): Either[String, UserRole] =
        value.trim.toLowerCase match
          case "admin" => Right(UserRole.Admin)
          case "reader" => Right(UserRole.Reader)
          case other => Left(s"Unsupported UserRole value: $other")

      given Encoder[UserRole] = Encoder.encodeString.contramap(toString)
      given Decoder[UserRole] = Decoder.decodeString.emap(fromString)

    UserRole.toString(value)
    UserRole.fromString(raw)


19. Consciously use types to fully cover finite states

When a concept has only a fixed set of possible states, represent it with an explicit type structure rather than a broad string or an unconstrained value.

For example: user roles, book inventory status, borrow record status, API message categories, frontend loading states, and permission states.

Depending on the situation, use enums, sealed traits, discriminated unions, literal union types, or equivalent type structures. Code handling these states should make missing branches hard to overlook.

When writing switch, match, or other branching logic, make unhandled cases arising from newly added states apparent during implementation. Do not introduce complex type mechanisms unnecessarily; but if the domain clearly has only a closed set of possible values, preserve that closedness in the type system.

    type BorrowStatus = "borrowed" | "returned" | "overdue"

    // This is better than allowing arbitrary strings.

20. Each API uses an independent, executable message class

Each API operation is placed in its own file as the primary executable unit of business behavior. api/ contains interfaces for use by other backend modules or the frontend, with names ending in Message.

APIs are defined using final case class, with inputs in the constructor parameters, extending APIMessage[Response], which has only a return type parameter, and executed via plan(connection: Connection): IO[Response].

    final case class SomeActionMessage(
      userId: UserId,
      itemId: ItemId
    ) extends APIMessage[SomeResponse]:
      override def plan(connection: Connection): IO[SomeResponse] =
        ...

Each file should clearly state the input fields, return result, business operation, and the table methods or other APIs used. Opening a single file should allow the reader to understand the operation without traversing multiple forwarding-only thin layers.


21. Use plan as the only necessary public execution entry point

Each API message should provide an explicit plan(connection: Connection): IO[Response] method. Business inputs are already contained in the message instance; execution passes in the connection.

    SomeActionMessage(userId, itemId).plan(connection)

If plan already represents the public execution entry point, do not add methods such as execute just to call it. Introduce additional methods only when they implement a real boundary or necessary shared mechanism.

22. Explicitly compose API side effects

API plans uniformly return IO[Response]. Database access, validation, permission checks, and business operations should be composed within IO; do not hide side-effecting behavior inside helper utilities that look like pure functions.

    def plan(connection: Connection): IO[Response]

Calls to other message plans and public Table methods should also be composed as visible steps of the current operation, keeping business order, error handling, and transaction expectations clear.

23. Avoid service layers that only forward calls

In the API message architecture, avoid creating a service layer that merely forwards API messages to the table layer.

A service layer is valuable only when it truly centralizes reusable domain logic and does not weaken service boundaries. If API messages are designed as the basic unit of business behavior, a forwarding layer is usually redundant.

    Avoid:
      APIMessage -> Service -> Table

    Where appropriate, prefer:
      APIMessage -> Table


24. Separate transport types from domain objects, and unify API return results

The main objects/ holds core domain types, and API-specific transport structures go in objects/apiTypes/. Domain objects represent system concepts, while transport types represent data shapes crossing specific API boundaries.

Each API has only one return result; if multiple result fields need to be returned together, organize these fields into a response data structure under objects/apiTypes/ and use that type as the return type parameter of APIMessage[Response].

    objects/
      apiTypes/
        CreateThingResponse.scala


25. Avoid meaningless empty request classes

Do not create empty request classes solely to satisfy generic abstractions. When an API has no business request input, express the operation directly with a no-request message; do not additionally define empty GetCurrentUserRequest, LogoutRequest, or RequireAdminRequest as input.

A message class with no parameters but containing plan behavior is an executable operation; an empty request wrapper class created only to fill in an input is unnecessary.

26. Directly support no-request APIs under the unified message model

Operations with no business request input use NoRequestMessage[Response]. This abstraction follows the single-return-type model of APIMessage[Response], and the execution entry point is likewise plan(connection), with no request type parameter introduced.

    final case class ListPublicItemsMessage() extends NoRequestMessage[List[Item]]:
      override def plan(connection: Connection): IO[List[Item]] =
        ...

27. Model according to real dependencies; do not inject context into every API by default

API business inputs are expressed by message constructor parameters, and plan by default receives only connection.

    final case class SomeActionMessage(itemId: ItemId) extends APIMessage[SomeResponse]:
      override def plan(connection: Connection): IO[SomeResponse] =
        ...

Do not force every message or plan to carry a generic Context, planContext, request metadata, or authentication metadata. When additional information is needed, express it explicitly according to actual dependencies; when not needed, do not add parameters or fields for uniform appearance.

28. Convert external tokens to trusted internal identity at the router boundary

Identity provided by the frontend should not directly become the identity trusted by the backend. If the frontend sends a token, the router should complete token validation and parsing through the API or encapsulated table methods provided by the user/account service, obtaining a trusted userId before constructing the business message and executing plan.

Backend business messages should receive trusted identity data, not unverified claims from the frontend. A userId self-reported by the frontend must not be treated as verified identity.

    External request carrying userToken
      -> Router completes token validation and parsing
      -> Construct internal message using trusted userId
      -> message.plan(connection)


29. Allow frontend and backend messages to use different data shapes at trust boundaries

Frontend and backend API message definitions do not have to be exactly the same. The router may intentionally keep the two different when performing security conversion.

For example, the frontend sends userToken, and after validation and parsing, the router constructs the backend message with a trusted userId. This difference reflects a clear trust boundary and should not be eliminated by directly trusting the frontend userId just to force both sides to have identical fields.

30. Keep API categories concise, and use token messages according to the scenario

Use a smaller API model to express real differences; do not unnecessarily add a large number of categories such as APIs requiring authentication, admin APIs, authenticated no-request APIs, and admin no-request APIs.

Ordinary messages use APIMessage[Response]; no-request operations use the corresponding no-request message abstraction. When token-related handling is truly needed, APIWithTokenMessage can be used, consistent with the model of a single return type, message fields carrying inputs, and plan(connection).

When the current data annotation scenario basically does not use APIWithTokenMessage, it may be left unused for now; there is no need to force its addition for formal completeness. When the scenario does have identity or permission requirements, they should still be handled explicitly; administrator permissions can be queried through the user/account service API, and a trusted userId can be an internal message field.

    APIMessage[Response]
    APIWithTokenMessage[Response]
    NoRequestMessage[Response]




31. Derive API route names automatically from message types

For route names that can be derived from API message type names, do not manually repeat the string in each message. Message names end with Message, and the specific route name is derived by a unified rule.

For example, using a unified rule that removes the trailing Message and lowercases it:

    BorrowBookAPIMessage -> borrowbookapi
    ListItemsAPIMessage -> listitemsapi
    SomeActionMessage -> someaction

Frontend and backend must use the same naming rule to avoid route names falling out of sync with message definitions.




32. Keep the router concise and declarative

The router is mainly responsible for dispatching requests to registered API messages and should not contain business logic. Business behavior goes in the message class's plan, making the router short, predictable, and easy to extend.

The router's main responsibilities:
- Receive the API name.
- Look up the corresponding API registration information.
- Deserialize request data.
- Perform the required token validation and userId conversion according to the API category.
- Construct the message instance based on the input and call plan(connection).
- Serialize the execution result.


33. Each service registers frontend APIs with one XXRoutes, merged at the top level

Each service's routes/ only needs one XXRoutes, used to register APIs used by the frontend. APIs called only by backend modules do not need to be registered in routes, nor do they need a frontend call file.

The global router merges service-level registration lists; do not manually repeat every API in every service. Registration information is used to locate the message type and its decoding/construction method; actual message instances are generated from request data.

    APIMessageRouter.routes(
      ServiceARoutes.apiMessages ++ ServiceBRoutes.apiMessages,
      resolveToken
    )

This keeps service registration modular and lets the top-level router show system composition rather than endpoint implementation details.



34. Clarify table service ownership and keep initialization in the owning table module

tables/ stores the database tables that the current service is responsible for. Generally, a table belongs to the service where it first appears in the business flow. Other services may call its public table methods, while maintenance ownership remains clear.

Each table's create statement and initialization method go in that table's folder in XXTableInitializer.scala, and indexes and constraints are also maintained by that table module. Do not put initialization in API files, and do not use one large initialization file to pile up definitions of many unrelated tables.

A table module should contain:
- The table's create SQL, indexes, and constraints.
- The table's initialization method.
- The table's public table functions.
- The table's internal row mapping and dedicated helper implementations.


35. Use a separate folder for each table, and distinguish table definition from initialization

Each table should have its own folder containing a table definition file XXTable.scala and an initialization file XXTableInitializer.scala.

XXTable.scala is centered on object XXTable, defining table functions and related SQL. XXTableInitializer.scala contains the create statement and initialization logic. Queries, row mapping, and helper implementations are still organized near the owning table module.

    tables/
      XXTable/
        XXTable.scala
        XXTableInitializer.scala

When logic is complex, further classification can be made under tables/, but each table's definition and initialization should be easy to find together.


36. Encapsulate each SQL value and table function as a pair, and uniformly return IO[T]

One table function is paired with one val and one def. The val name ends with Sql and its value is a SQL string; the def executes the corresponding table operation and is callable by APIs throughout the backend.

SQL values and execution methods should be adjacent, avoiding piling all SQL at the top and all methods at the bottom. SQL values remain private, and public methods encapsulate parameter handling, execution, and row mapping.

    object TextbookTable:
      private val findByIdSql = "..."
      def findById(connection: Connection, id: TextbookId): IO[Option[Textbook]] = ...

      private val insertSql = "..."
      def insert(connection: Connection, textbook: Textbook): IO[TextbookId] = ...

Table functions uniformly return IO[T], such as IO[SomeObject], IO[List[SomeObject]], IO[Option[SomeObject]]; T does not necessarily have to be a domain object.

37. Table functions should not contain too much business processing. Complex logic goes in APIs or the corresponding service's utils, and table functions remain clearly scoped. Cross-service callers use public defs and do not access their SQL values or private helper functions.


38. Put SQL before the corresponding method

When organizing SQL and methods in pairs, place the SQL statement before the method that uses it, not after.

The reader should see the query first, then immediately see how to execute it. This order reduces the cost of searching back and forth in the table file.

39. Restrict shared frontend components to true UI foundational components

The frontend's shared components folder should contain only widely reusable UI foundational components, such as components used by multiple pages.

Page-specific components should not remain in the global shared components folder. If a component is used by only one page, place it near that page.

    components/
      ui/


40. Keep page-specific frontend code near the page

If a component, hook, store, function, or object belongs to only one page, place it inside that page's folder. This keeps related code together and reduces clutter in global directories.

Prefer organizing code nearby rather than piling content into global directories. Code that explains how a page works should be placed near that page.

    pages/
      SomePage/
        index.tsx
        components/
        hooks/
        functions/
        stores/
        objects/


41. Split frontend pages by visible business areas

Complex frontend pages should be split by meaningful business areas, not arbitrarily by visual fragments. The file structure should reflect the user-facing workflow and the main areas the reader needs to understand.

Each major page area should correspond to a clear component or component folder. For example, a page might contain a reading panel, selection panel, draft area, rule check area, confirmation area, and record area.

    SomePage/
      index.tsx
      components/
        ReaderPanel/
        SelectionPanel/
        DraftPanel/
        RulePanel.tsx
        ConfirmPanel.tsx


42. Use page-level hooks, objects, and functions for page-shared logic

When multiple business areas depend on the same state, data structures, or pure computations, a complex page can have page-level hooks, objects, and functions.

Page-level hooks are used for state shared by multiple areas, such as selected entities, drafts, filters, records, loading state, or page-level coordination logic.

Page-level objects are used for data structures belonging to the whole page, such as drafts, summaries, rule check results, filters, or page-specific view models.

Page-level functions are used for pure logic shared by the whole page, such as building summaries, filtering records, computing rule check results, or transforming page data. When multiple areas depend on a piece of page-shared logic, do not bury it inside one subcomponent.

    SomePage/
      index.tsx
      hooks/
        useSomePage.ts
      objects/
        SomeDraft.ts
        SomeSummary.ts
      functions/
        buildRuleChecks.ts
        buildSummary.ts
      components/


43. Adopt a general complex-page structure for feature-rich frontend pages

For complex frontend pages, prefer a page-level structure that separately organizes the page skeleton, page-shared state, page-specific objects, page pure functions, and business area components. This keeps pages predictable without making every page identical.

Specific names should match the business domain, but the overall pattern should remain stable: index.tsx shows the page's high-level structure; page-level hooks coordinate shared state; page-level objects define page-level data structures; page-level functions hold page pure logic; components contain the visible areas of the page.

Complex business areas can recursively contain their own index.tsx, hooks, objects, functions, and components, but only when internal complexity truly requires this extra level. Structure should help the reader understand how the page works, not force them to shuttle through unnecessary folders.

    SomeComplexPage/
      index.tsx

      hooks/
        useSomeComplexPage.ts
        useSomePageState.ts

      objects/
        PageDraft.ts
        PageSummary.ts
        PageRuleCheck.ts

      functions/
        buildPageSummary.ts
        buildRuleChecks.ts
        filterPageRecords.ts

      components/
        PageHeader.tsx
        SimplePanel.tsx

        MajorBusinessRegion/
          index.tsx
          RegionToolbar.tsx
          hooks/
            useMajorBusinessRegion.ts
          objects/
            RegionFilter.ts
            RegionViewModel.ts
          components/
            RegionList/
              index.tsx
              RegionRow.tsx
              RegionStatusBadge.tsx
              RegionActions.tsx


44. Keep the entry file of a complex page as a skeleton

For complex frontend pages, index.tsx should show the page's main structure rather than all implementation details.

Move detailed UI sections, helper functions, local state logic, stores, and subcomponents into nearby files. The page entry file should answer: what are the main areas of this page?

This makes the page layout easy to inspect, just as a concise router makes the backend API structure easy to inspect.

45. Do not hide the page's main structure inside an ambiguous layout wrapper

The page entry file should clearly show the page's main business areas. If an ambiguous layout wrapper would obscure what the page actually contains, do not move the page's main structure into that wrapper.

A layout wrapper may be used only when it explains the layout without obscuring the business structure. After opening index.tsx, the reader should immediately see the main page areas.

    Avoid hiding everything behind a wrapper such as:
      <SomePageLayout page={page} />

    Prefer a clearly visible skeleton:
      <ReaderPanel />
      <RulePanel />
      <SelectionPanel />
      <DraftPanel />
      <ConfirmPanel />


46. Recursively split complex areas only when complexity truly requires it

Complex business areas can have their own local hooks, objects, functions, and subcomponents. This is appropriate when the area has multiple cooperating submodules or its internal state makes a single file hard to read.

Do not create nested folders just to look structured. If an area has only one simple component, keep it as a single .tsx file at the current level.

Every additional folder should make the code easier to read, test, reuse, or locate.

    Complex area:
      SelectionPanel/
        index.tsx
        SearchToolbar.tsx
        hooks/
        objects/
        components/
          CandidateList/

    Simple area:
      RulePanel.tsx


47. Avoid formal module splitting that increases lookup cost

Modularization should reduce cognitive load, not increase it. Do not create folders and subcomponents just to make the project look modular.

If splitting forces the reader to open more files without helping them form a clearer understanding, keep a flatter implementation.

A single file is often clearer than a folder hierarchy that exists only for formal consistency.

    For simple components, prefer:
      components/
        RulePanel.tsx

    Avoid, if unnecessary:
      components/
        RulePanel/
          index.tsx
          components/
            RuleCheckList.tsx



48. Create frontend API folders by service

Where feasible, frontend API organization should correspond to backend service boundaries.

Each frontend API folder should correspond to one backend service. This makes it easier to trace a frontend call to the backend API handling it.

    src/
      apis/
        service-a/
        service-b/



49. For frontend-facing APIs, keep frontend and backend files corresponding one-to-one as much as possible

A backend API message exposed to the frontend should usually have a corresponding frontend call file or class, making it easy to trace from the frontend to the backend implementation.

Internal APIs used only by backend modules and not registered in routes do not need corresponding frontend call files. Platform-specific implementations and trust boundary conversions can also form reasonable differences; unexplained mismatches should be avoided.

    Frontend API file
      -> Backend API message
      -> Public table methods/domain logic


50. Put common API infrastructure outside service-specific folders

Common frontend API infrastructure should not be placed in a specific service's folder. If a utility applies to all API calls, place it next to the shared API sending infrastructure.

Service folders should contain service-specific API classes and objects, not global API mechanisms.

Common API infrastructure includes:
- Token storage
- API name computation
- Common sending logic
- API base classes
- Shared request/response handling


51. Split large frontend API utilities by responsibility

Avoid large API utility files that define too many unrelated things. When responsibilities become clearly different, split them.

This keeps each infrastructure file easy to inspect and prevents a single utility from evolving into a hidden framework.

They can be split by responsibilities such as:
- API base classes
- API name computation
- Send functions
- Token handling
- Error handling
- Serialization helpers


52. Use concise frontend API classes with a send method

Frontend API definitions should be easy to read. A recommended style is to define each API as a class with explicit input fields and a method that sends the request.

This makes each frontend API caller concrete and easy to inspect, rather than hiding behavior in large generic utilities.

    class SomeAPI {
      // Input fields
      send(): Promise<Response> {
        ...
      }
    }


53. Derive frontend API names through a unified method

If a shared naming utility can consistently derive route names, do not let each frontend API class repeatedly define its own apiName method.

This corresponds to the backend rule: eliminate duplicated route names wherever it can be done safely. A unified derivation method prevents naming drift between frontend callers and backend API messages.


54. Remove unused application scaffolding, assets, and library files

Template projects often contain folders whose purpose becomes unclear after refactoring. When folders such as app, assets, and lib appear unused, re-examine whether they need to be kept.

If they are unreferenced and do not support the current architecture, remove them. Do not keep useless scaffolding just because it came with the template.


55. Strictly follow the declared styling system

Project standards require Tailwind; avoid custom CSS unless truly necessary. Remove or reduce CSS files and CSS-oriented utilities that conflict with the Tailwind-only requirement.

Class name utilities may be kept only when they support Tailwind usage and are genuinely needed. Styling infrastructure should be consistent with the project's declared standard.


56. Prefer clear folder names

Folder names should convey purpose. If a folder contains utilities, name it utils rather than an ambiguous name such as internal, unless internal has a precise architectural meaning in the project.

Names should help future readers understand ownership and intent without opening every file.


57. Put shared page objects in a clear page-level location

If page-level shared objects exist, place them in a clear folder such as pages/objects.

Avoid obscure shared paths that make ownership unclear. The path should indicate whether an object is global, service-specific, or page-specific.


58. Prefer simple TypeScript style and avoid unnecessary complexity

When appropriate for the project, use clear, direct TypeScript. Do not make frontend type structures unnecessarily complex just for theoretical elegance.

Strong typing is valuable, but abstractions should improve maintainability or safety. If the existing TypeScript style is already readable and sufficient, preserve that simplicity.


59. Separate documentation artifacts from source logic

Generated documentation should go in the required documentation folder, not mixed into backend or frontend source folders.

Source directories should contain application code. When the corresponding artifacts are required, the documentation directory should contain generated reports, PDFs, architecture descriptions, and conversation history.


60. Consciously model complex page states

Complex pages that depend on APIs should explicitly model loading, ready, empty, error, and related operation states. This is especially useful for dashboards, search interfaces, detail views, booking or messaging flows, upload features, and pages with multiple interdependent areas.

Simple independent forms can remain simple. If local submission state and error state remain clear and do not allow confusing state combinations, small forms can use this local state. Do not introduce huge union types just for theoretical elegance.

    type PageState =
      | { status: "loading" }
      | { status: "ready"; data: Data }
      | { status: "empty" }
      | { status: "error"; message: string }
      | { status: "submitting" }