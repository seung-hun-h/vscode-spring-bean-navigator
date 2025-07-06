import { ClassInfo, InjectionInfo } from "../models/spring-types";

export interface InjectionDetector {
    detectAllInjections(classes: ClassInfo[]): InjectionInfo[];
}