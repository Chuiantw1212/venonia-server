/**
 * https://schema.org/Organization
 */

export interface IPlace {
    [key: string]: any
    name: string;
    uid: string;
    id: string; // doc id
    description: string,
    addressRegion:string, // 第一級行政區
}