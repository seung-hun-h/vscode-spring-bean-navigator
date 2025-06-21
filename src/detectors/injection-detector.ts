import { ClassInfo, InjectionInfo } from "../models/spring-types";

export interface IInjectionDetector {
    detectAllInjections(classes: ClassInfo[]): InjectionInfo[];
}