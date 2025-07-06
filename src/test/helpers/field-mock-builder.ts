/**
 * Field Extractor mock data generator
 * Builder pattern for easily creating complex CST structures
 */
export class FieldMockBuilder {
    private fieldName: string = 'testField';
    private fieldType: string = 'String';
    private isPrimitive: boolean = false;
    private modifiers: string[] = [];

    /**
     * Sets field name
     */
    public withName(name: string): FieldMockBuilder {
        this.fieldName = name;
        return this;
    }

    /**
     * Sets field type (reference type)
     */
    public withType(type: string): FieldMockBuilder {
        this.fieldType = type;
        this.isPrimitive = false;
        return this;
    }

    /**
     * Sets primitive type (int, boolean, etc.)
     */
    public withPrimitiveType(type: 'int' | 'boolean' | 'char' | 'byte' | 'short' | 'long' | 'float' | 'double'): FieldMockBuilder {
        this.fieldType = type;
        this.isPrimitive = true;
        return this;
    }

    /**
     * Adds private modifier
     */
    public asPrivate(): FieldMockBuilder {
        this.modifiers.push('Private');
        return this;
    }

    /**
     * Adds final modifier
     */
    public asFinal(): FieldMockBuilder {
        this.modifiers.push('Final');
        return this;
    }

    /**
     * Adds static modifier
     */
    public asStatic(): FieldMockBuilder {
        this.modifiers.push('Static');
        return this;
    }

    /**
     * Adds transient modifier
     */
    public asTransient(): FieldMockBuilder {
        this.modifiers.push('Transient');
        return this;
    }

    /**
     * Adds volatile modifier
     */
    public asVolatile(): FieldMockBuilder {
        this.modifiers.push('Volatile');
        return this;
    }

    /**
     * Builds field mock data
     */
    public build(): any {
        return {
            children: {
                unannType: [this.buildTypeStructure()],
                variableDeclaratorList: [this.buildVariableDeclaratorList()],
                fieldModifier: this.buildFieldModifiers()
            }
        };
    }

    /**
     * Builds type structure (reference type vs primitive type)
     */
    private buildTypeStructure(): any {
        if (this.isPrimitive) {
            return this.buildPrimitiveType();
        } else {
            return this.buildReferenceType();
        }
    }

    /**
     * Builds reference type structure
     */
    private buildReferenceType(): any {
        return {
            children: {
                unannReferenceType: [{
                    children: {
                        unannClassOrInterfaceType: [{
                            children: {
                                unannClassType: [{
                                    children: {
                                        Identifier: [{ image: this.fieldType }]
                                    }
                                }]
                            }
                        }]
                    }
                }]
            }
        };
    }

    /**
     * Builds primitive type structure
     */
    private buildPrimitiveType(): any {
        const primitiveMap: Record<string, any> = {
            'int': { IntegralType: [{ children: { Int: [{ image: 'int' }] } }] },
            'boolean': { Boolean: [{ image: 'boolean' }] },
            'char': { IntegralType: [{ children: { Char: [{ image: 'char' }] } }] },
            'byte': { IntegralType: [{ children: { Byte: [{ image: 'byte' }] } }] },
            'short': { IntegralType: [{ children: { Short: [{ image: 'short' }] } }] },
            'long': { IntegralType: [{ children: { Long: [{ image: 'long' }] } }] },
            'float': { FloatingPointType: [{ children: { Float: [{ image: 'float' }] } }] },
            'double': { FloatingPointType: [{ children: { Double: [{ image: 'double' }] } }] }
        };

        return {
            children: {
                unannPrimitiveType: [{
                    children: primitiveMap[this.fieldType]
                }]
            }
        };
    }

    /**
     * Builds variable declarator list
     */
    private buildVariableDeclaratorList(): any {
        return {
            children: {
                variableDeclarator: [{
                    children: {
                        variableDeclaratorId: [{
                            children: {
                                Identifier: [{ image: this.fieldName }]
                            }
                        }]
                    }
                }]
            }
        };
    }

    /**
     * Builds field modifiers
     */
    private buildFieldModifiers(): any[] {
        return this.modifiers.map(modifier => ({
            children: {
                [modifier]: [{ image: modifier.toLowerCase() }]
            }
        }));
    }

    /**
     * Creates new Builder instance
     */
    public static create(): FieldMockBuilder {
        return new FieldMockBuilder();
    }

    /**
     * Static methods for frequently used patterns
     */

    /**
     * private final String field
     */
    public static privateFinalString(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withType('String')
            .asPrivate()
            .asFinal()
            .build();
    }

    /**
     * private final int field
     */
    public static privateFinalInt(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withPrimitiveType('int')
            .asPrivate()
            .asFinal()
            .build();
    }

    /**
     * private static final constant field
     */
    public static privateStaticFinalString(name: string): any {
        return FieldMockBuilder.create()
            .withName(name)
            .withType('String')
            .asPrivate()
            .asStatic()
            .asFinal()
            .build();
    }

    /**
     * Field mock with @NonNull annotation
     */
    public static withNonNullAnnotation(name: string, type: string = 'String'): any {
        const fieldMock = FieldMockBuilder.create()
            .withName(name)
            .withType(type)
            .asPrivate()
            .build();
        
        // @NonNull annotation addition
        fieldMock.children.fieldModifier.push({
            children: {
                annotation: [{
                    children: {
                        At: [{ image: '@' }],
                        typeName: [{
                            children: {
                                Identifier: [{ image: 'NonNull' }]
                            }
                        }]
                    }
                }]
            }
        });

        return fieldMock;
    }
} 