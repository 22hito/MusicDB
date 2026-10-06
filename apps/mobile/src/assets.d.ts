/** Картинки з assets/ — Metro віддає їх як числовий id ресурсу. */
declare module "*.png" {
  const id: number;
  export default id;
}
