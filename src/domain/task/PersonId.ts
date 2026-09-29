export type PersonId = 'a' | 'b'

export function otherPerson(person: PersonId): PersonId {
  return person === 'a' ? 'b' : 'a'
}

export function defaultPersonName(person: PersonId): string {
  return person === 'a' ? 'Yo' : 'Pareja'
}
